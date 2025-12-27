import * as zlib from 'zlib';
import { prisma, Operation as PrismaOperation } from '../db';
import {
  Operation,
  ServerOperation,
  UploadResult,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  compareVectorClocks,
  VectorClock,
  SYNC_ERROR_CODES,
} from './sync.types';
import { Logger } from '../logger';
import {
  CURRENT_SCHEMA_VERSION,
  migrateState,
  migrateOperation,
  stateNeedsMigration,
  type OperationLike,
} from '@sp/shared-schema';
import { Prisma } from '@prisma/client';
import {
  ValidationService,
  ALLOWED_ENTITY_TYPES,
  RateLimitService,
  RequestDeduplicationService,
  DeviceService,
  OperationDownloadService,
} from './services';

/**
 * Maximum operations to process during snapshot generation.
 * Prevents memory exhaustion for users with excessive operation history.
 */
const MAX_OPS_FOR_SNAPSHOT = 100000;

/**
 * Maximum compressed snapshot size in bytes (50MB).
 * Prevents storage exhaustion from excessively large snapshots.
 */
const MAX_SNAPSHOT_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Default storage quota per user in bytes (100MB).
 */
const DEFAULT_STORAGE_QUOTA_BYTES = 100 * 1024 * 1024;

/**
 * Maximum decompressed snapshot size in bytes (100MB).
 * Prevents zip bombs from exhausting memory when reading cached snapshots.
 */
const MAX_SNAPSHOT_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

/**
 * Maximum state size during replay (100MB).
 * Prevents memory exhaustion from malicious or corrupted data.
 */
const MAX_REPLAY_STATE_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * How often to check state size during replay (every N operations).
 */
const REPLAY_SIZE_CHECK_INTERVAL = 1000;

export class SyncService {
  private config: SyncConfig;
  private validationService: ValidationService;
  private rateLimitService: RateLimitService;
  private requestDeduplicationService: RequestDeduplicationService;
  private deviceService: DeviceService;
  private operationDownloadService: OperationDownloadService;

  /**
   * FIX 1.7: In-memory lock to prevent concurrent snapshot generation for the same user.
   * Maps userId to a Promise that resolves when generation completes.
   * Concurrent requests wait for the existing generation and reuse its result.
   */
  private snapshotGenerationLocks: Map<
    number,
    Promise<{
      state: unknown;
      serverSeq: number;
      generatedAt: number;
      schemaVersion: number;
    }>
  > = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.validationService = new ValidationService(this.config);
    this.rateLimitService = new RateLimitService(this.config);
    this.requestDeduplicationService = new RequestDeduplicationService();
    this.deviceService = new DeviceService();
    this.operationDownloadService = new OperationDownloadService();
  }

  // === Conflict Detection ===

  /**
   * Check if an incoming operation conflicts with existing operations.
   * Returns conflict info if a concurrent modification is detected.
   */
  private async detectConflict(
    userId: number,
    op: Operation,
    tx: Prisma.TransactionClient,
  ): Promise<{ hasConflict: boolean; reason?: string; existingClock?: VectorClock }> {
    // Skip conflict detection for full-state operations
    if (
      op.opType === 'SYNC_IMPORT' ||
      op.opType === 'BACKUP_IMPORT' ||
      op.opType === 'REPAIR'
    ) {
      return { hasConflict: false };
    }

    // Build list of entity IDs to check for conflicts.
    // Operations may have either entityId (singular) or entityIds (batch operations).
    const entityIdsToCheck: string[] = op.entityIds?.length
      ? op.entityIds
      : op.entityId
        ? [op.entityId]
        : [];

    // Skip if no entity IDs (can't have entity-level conflicts)
    if (entityIdsToCheck.length === 0) {
      return { hasConflict: false };
    }

    // Check each entity for conflicts
    for (const entityId of entityIdsToCheck) {
      const conflictResult = await this.detectConflictForEntity(userId, op, entityId, tx);
      if (conflictResult.hasConflict) {
        return conflictResult;
      }
    }

    return { hasConflict: false };
  }

  /**
   * Checks for conflicts on a single entity.
   * Extracted from detectConflict to support multi-entity operations.
   */
  private async detectConflictForEntity(
    userId: number,
    op: Operation,
    entityId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ hasConflict: boolean; reason?: string; existingClock?: VectorClock }> {
    // Get the latest operation for this entity
    const existingOp = await tx.operation.findFirst({
      where: {
        userId,
        entityType: op.entityType,
        entityId,
      },
      orderBy: {
        serverSeq: 'desc',
      },
    });

    // No existing operation = no conflict
    if (!existingOp) {
      return { hasConflict: false };
    }

    // Parse the existing operation's vector clock (Prisma returns Json, cast to VectorClock)
    const existingClock = existingOp.vectorClock as unknown as VectorClock;

    // Compare vector clocks
    const comparison = compareVectorClocks(op.vectorClock, existingClock);

    // If the incoming op's clock is GREATER_THAN existing, it's a valid successor
    if (comparison === 'GREATER_THAN') {
      return { hasConflict: false };
    }

    // If clocks are EQUAL, this might be a retry of the same operation - check if from same client
    if (comparison === 'EQUAL' && op.clientId === existingOp.clientId) {
      return { hasConflict: false };
    }

    // EQUAL clocks from different clients is suspicious - treat as conflict
    // This could happen if client IDs rotate or clocks are somehow reused
    if (comparison === 'EQUAL') {
      return {
        hasConflict: true,
        reason: `Equal vector clocks from different clients for ${op.entityType}:${entityId} (client ${op.clientId} vs ${existingOp.clientId})`,
        existingClock,
      };
    }

    // CONCURRENT means both clocks have entries the other doesn't
    if (comparison === 'CONCURRENT') {
      return {
        hasConflict: true,
        reason: `Concurrent modification detected for ${op.entityType}:${entityId}`,
        existingClock,
      };
    }

    // LESS_THAN means the incoming op is older than what we have
    if (comparison === 'LESS_THAN') {
      return {
        hasConflict: true,
        reason: `Stale operation: server has newer version of ${op.entityType}:${entityId}`,
        existingClock,
      };
    }

    // Should never reach here - all comparison cases handled above
    // But if we do, default to conflict for safety
    return {
      hasConflict: true,
      reason: `Unknown vector clock comparison result for ${op.entityType}:${entityId}`,
      existingClock,
    };
  }

  // === Upload Operations ===

  async uploadOps(
    userId: number,
    clientId: string,
    ops: Operation[],
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const now = Date.now();

    try {
      // Use transaction to acquire write lock and ensure atomicity
      await prisma.$transaction(
        async (tx) => {
          // Ensure user has sync state row (init if needed)
          // We assume user exists in `users` table because of foreign key,
          // but if `uploadOps` is called, authentication should have verified user existence.
          // However, `user_sync_state` might not exist yet.
          await tx.userSyncState.upsert({
            where: { userId },
            create: { userId, lastSeq: 0 },
            update: {}, // No-op update to ensure it exists
          });

          for (const op of ops) {
            const result = await this.processOperation(userId, clientId, op, now, tx);
            results.push(result);
          }

          // Update device last seen
          await tx.syncDevice.upsert({
            where: {
              // Prisma composite key naming uses underscores; allow it here
              // eslint-disable-next-line @typescript-eslint/naming-convention
              userId_clientId: {
                userId,
                clientId,
              },
            },
            create: {
              userId,
              clientId,
              lastSeenAt: BigInt(now),
              createdAt: BigInt(now),
              lastAckedSeq: 0,
            },
            update: {
              lastSeenAt: BigInt(now),
            },
          });
        },
        {
          // Large operations like SYNC_IMPORT/BACKUP_IMPORT can have payloads up to 20MB.
          // Default Prisma timeout (5s) is too short for these. Use 60s to match generateSnapshot.
          timeout: 60000,
          // FIX 1.6: Set explicit isolation level for strict consistency.
          // REPEATABLE_READ prevents phantom reads and ensures consistent conflict detection.
          // Combined with the FIX 1.5 re-check after sequence allocation, this prevents
          // race conditions where two concurrent requests both pass conflict detection.
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        },
      );
    } catch (err) {
      // Transaction failed - all operations were rolled back
      const errorMessage = (err as Error).message || 'Unknown error';

      // Check if this is a serialization failure (concurrent transaction conflict)
      // Prisma uses P2034 for "Transaction failed due to a write conflict or a deadlock"
      // PostgreSQL uses 40001 (serialization_failure) and 40P01 (deadlock_detected)
      const isSerializationFailure =
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') ||
        errorMessage.includes('40001') ||
        errorMessage.includes('40P01') ||
        errorMessage.toLowerCase().includes('serialization') ||
        errorMessage.toLowerCase().includes('deadlock');

      // Check if this is a timeout error (common for large payloads)
      const isTimeout =
        errorMessage.toLowerCase().includes('timeout') || errorMessage.includes('P2028');

      if (isSerializationFailure) {
        Logger.warn(
          `Transaction serialization failure for user ${userId} - client should retry: ${errorMessage}`,
        );
      } else {
        Logger.error(`Transaction failed for user ${userId}: ${errorMessage}`);
      }

      // Mark all "successful" results as failed due to transaction rollback
      // Use INTERNAL_ERROR for all transient failures - client will retry
      return ops.map((op) => ({
        opId: op.id,
        accepted: false,
        error: isSerializationFailure
          ? 'Concurrent transaction conflict - please retry'
          : isTimeout
            ? 'Transaction timeout - server busy, please retry'
            : `Transaction rolled back: ${errorMessage}`,
        errorCode: SYNC_ERROR_CODES.INTERNAL_ERROR,
      }));
    }

    return results;
  }

  /**
   * Process a single operation within a transaction.
   * Handles validation, conflict detection, and persistence.
   */
  private async processOperation(
    userId: number,
    clientId: string,
    op: Operation,
    now: number,
    tx: Prisma.TransactionClient,
  ): Promise<UploadResult> {
    try {
      // Validate operation (including clientId match)
      const validation = this.validationService.validateOp(op, clientId);
      if (!validation.valid) {
        Logger.audit({
          event: 'OP_REJECTED',
          userId,
          clientId,
          opId: op.id,
          entityType: op.entityType,
          entityId: op.entityId,
          errorCode: validation.errorCode,
          reason: validation.error,
          opType: op.opType,
        });
        return {
          opId: op.id,
          accepted: false,
          error: validation.error,
          errorCode: validation.errorCode,
        };
      }

      // Check for conflicts with existing operations
      const conflict = await this.detectConflict(userId, op, tx);
      if (conflict.hasConflict) {
        const isConcurrent = conflict.reason?.includes('Concurrent');
        const errorCode = isConcurrent
          ? SYNC_ERROR_CODES.CONFLICT_CONCURRENT
          : SYNC_ERROR_CODES.CONFLICT_STALE;
        Logger.audit({
          event: 'OP_REJECTED',
          userId,
          clientId,
          opId: op.id,
          entityType: op.entityType,
          entityId: op.entityId,
          errorCode,
          reason: conflict.reason,
          opType: op.opType,
        });
        return {
          opId: op.id,
          accepted: false,
          error: conflict.reason,
          errorCode,
        };
      }

      // Get next sequence number
      const updatedState = await tx.userSyncState.update({
        where: { userId },
        data: { lastSeq: { increment: 1 } },
      });
      const serverSeq = updatedState.lastSeq;

      // FIX 1.5: Re-check for conflicts after sequence allocation.
      // This catches races where another request inserted an operation for the same
      // entity between our initial conflict check and now. Combined with REPEATABLE_READ
      // isolation, this ensures no undetected concurrent modifications.
      const finalConflict = await this.detectConflict(userId, op, tx);
      if (finalConflict.hasConflict) {
        const isConcurrent = finalConflict.reason?.includes('Concurrent');
        const errorCode = isConcurrent
          ? SYNC_ERROR_CODES.CONFLICT_CONCURRENT
          : SYNC_ERROR_CODES.CONFLICT_STALE;
        Logger.audit({
          event: 'OP_REJECTED',
          userId,
          clientId,
          opId: op.id,
          entityType: op.entityType,
          entityId: op.entityId,
          errorCode,
          reason: `[RACE] ${finalConflict.reason}`,
          opType: op.opType,
        });
        return {
          opId: op.id,
          accepted: false,
          error: finalConflict.reason,
          errorCode,
        };
      }

      await tx.operation.create({
        data: {
          id: op.id,
          userId,
          clientId,
          serverSeq,
          actionType: op.actionType,
          opType: op.opType,
          entityType: op.entityType,
          entityId: op.entityId ?? null,
          payload: op.payload as Prisma.InputJsonValue,
          vectorClock: op.vectorClock as Prisma.InputJsonValue,
          schemaVersion: op.schemaVersion,
          clientTimestamp: BigInt(op.timestamp),
          receivedAt: BigInt(now),
          parentOpId: op.parentOpId ?? null,
          isPayloadEncrypted: op.isPayloadEncrypted ?? false,
        },
      });

      // Create tombstone for delete operations
      if (op.opType === 'DEL' && op.entityId) {
        await this.createTombstoneSync(userId, op.entityType, op.entityId, op.id, tx);
      }

      return {
        opId: op.id,
        accepted: true,
        serverSeq,
      };
    } catch (err: unknown) {
      // Duplicate ID (already processed) - idempotency
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' // Unique constraint violation
      ) {
        Logger.audit({
          event: 'OP_REJECTED',
          userId,
          clientId,
          opId: op.id,
          entityType: op.entityType,
          entityId: op.entityId,
          errorCode: SYNC_ERROR_CODES.DUPLICATE_OPERATION,
          reason: 'Duplicate operation ID',
          opType: op.opType,
        });
        return {
          opId: op.id,
          accepted: false,
          error: 'Duplicate operation ID',
          errorCode: SYNC_ERROR_CODES.DUPLICATE_OPERATION,
        };
      }
      // Re-throw unexpected errors to trigger transaction rollback
      throw err;
    }
  }

  private async createTombstoneSync(
    userId: number,
    entityType: string,
    entityId: string,
    deletedByOpId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = now + this.config.tombstoneRetentionMs;

    await tx.tombstone.upsert({
      where: {
        // Prisma composite key naming uses underscores; allow it here
        // eslint-disable-next-line @typescript-eslint/naming-convention
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
      create: {
        userId,
        entityType,
        entityId,
        deletedAt: BigInt(now),
        deletedByOpId,
        expiresAt: BigInt(expiresAt),
      },
      update: {
        deletedAt: BigInt(now),
        deletedByOpId,
        expiresAt: BigInt(expiresAt),
      },
    });
  }

  // === Download Operations ===
  // Delegated to OperationDownloadService

  async getOpsSince(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): Promise<ServerOperation[]> {
    return this.operationDownloadService.getOpsSince(
      userId,
      sinceSeq,
      excludeClient,
      limit,
    );
  }

  async getOpsSinceWithSeq(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): Promise<{
    ops: ServerOperation[];
    latestSeq: number;
    gapDetected: boolean;
    latestSnapshotSeq?: number;
    snapshotVectorClock?: VectorClock;
  }> {
    return this.operationDownloadService.getOpsSinceWithSeq(
      userId,
      sinceSeq,
      excludeClient,
      limit,
    );
  }

  async getLatestSeq(userId: number): Promise<number> {
    return this.operationDownloadService.getLatestSeq(userId);
  }

  // === Snapshot Management ===

  async getCachedSnapshot(userId: number): Promise<{
    state: unknown;
    serverSeq: number;
    generatedAt: number;
    schemaVersion: number;
  } | null> {
    const row = await prisma.userSyncState.findUnique({
      where: { userId },
      select: {
        snapshotData: true,
        lastSnapshotSeq: true,
        snapshotAt: true,
        snapshotSchemaVersion: true,
      },
    });

    if (!row?.snapshotData) return null;

    try {
      // Decompress snapshot
      const decompressed = zlib
        .gunzipSync(row.snapshotData, {
          maxOutputLength: MAX_SNAPSHOT_DECOMPRESSED_BYTES,
        })
        .toString('utf-8');
      return {
        state: JSON.parse(decompressed),
        serverSeq: row.lastSnapshotSeq ?? 0,
        generatedAt: Number(row.snapshotAt) ?? 0,
        schemaVersion: row.snapshotSchemaVersion ?? 1,
      };
    } catch (err) {
      Logger.error(
        `[user:${userId}] Failed to decompress cached snapshot: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async cacheSnapshot(userId: number, state: unknown, serverSeq: number): Promise<void> {
    const now = Date.now();
    // Compress snapshot
    const compressed = zlib.gzipSync(JSON.stringify(state));

    if (compressed.length > MAX_SNAPSHOT_SIZE_BYTES) {
      Logger.error(
        `[user:${userId}] Snapshot too large: ${compressed.length} bytes ` +
          `(max ${MAX_SNAPSHOT_SIZE_BYTES}). Skipping cache.`,
      );
      return;
    }

    await prisma.userSyncState.update({
      where: { userId },
      data: {
        snapshotData: compressed,
        lastSnapshotSeq: serverSeq,
        snapshotAt: BigInt(now),
        snapshotSchemaVersion: CURRENT_SCHEMA_VERSION,
      },
    });
  }

  async generateSnapshot(userId: number): Promise<{
    state: unknown;
    serverSeq: number;
    generatedAt: number;
    schemaVersion: number;
  }> {
    // FIX 1.7: Check if snapshot generation is already in progress for this user.
    // If so, wait for the existing generation and return its result.
    // This prevents duplicate expensive computation under concurrent requests.
    const existingPromise = this.snapshotGenerationLocks.get(userId);
    if (existingPromise) {
      Logger.info(`Waiting for existing snapshot generation for user ${userId}`);
      return existingPromise;
    }

    // Start new generation and store the promise
    const promise = this._generateSnapshotImpl(userId);
    this.snapshotGenerationLocks.set(userId, promise);

    try {
      return await promise;
    } finally {
      // Clean up lock when done (whether success or failure)
      this.snapshotGenerationLocks.delete(userId);
    }
  }

  /**
   * Internal implementation of snapshot generation.
   * Called only when no concurrent generation is in progress.
   */
  private async _generateSnapshotImpl(userId: number): Promise<{
    state: unknown;
    serverSeq: number;
    generatedAt: number;
    schemaVersion: number;
  }> {
    // Transaction for consistent view
    return prisma.$transaction(
      async (tx) => {
        // Get latest seq in this transaction
        const seqRow = await tx.userSyncState.findUnique({
          where: { userId },
          select: { lastSeq: true },
        });
        const latestSeq = seqRow?.lastSeq ?? 0;

        let state: Record<string, unknown> = {};
        let startSeq = 0;
        let snapshotSchemaVersion = CURRENT_SCHEMA_VERSION;

        // Try to get cached snapshot (need to fetch it inside tx for consistency?
        // Actually, we can fetch it. If it's old, we just replay more ops.)
        // Re-implementing getCachedSnapshot logic inside tx
        const cachedRow = await tx.userSyncState.findUnique({
          where: { userId },
          select: {
            snapshotData: true,
            lastSnapshotSeq: true,
            snapshotAt: true,
            snapshotSchemaVersion: true,
          },
        });

        if (cachedRow?.snapshotData) {
          try {
            const decompressed = zlib
              .gunzipSync(cachedRow.snapshotData, {
                maxOutputLength: MAX_SNAPSHOT_DECOMPRESSED_BYTES,
              })
              .toString('utf-8');
            state = JSON.parse(decompressed) as Record<string, unknown>;
            startSeq = cachedRow.lastSnapshotSeq ?? 0;
            snapshotSchemaVersion = cachedRow.snapshotSchemaVersion ?? 1;
          } catch (err) {
            // Ignore corrupted cache
          }
        }

        if (
          startSeq >= latestSeq &&
          cachedRow?.snapshotData &&
          snapshotSchemaVersion === CURRENT_SCHEMA_VERSION
        ) {
          return {
            state,
            serverSeq: startSeq,
            generatedAt: Date.now(),
            schemaVersion: CURRENT_SCHEMA_VERSION,
          };
        }

        // Migrate snapshot if needed
        if (stateNeedsMigration(snapshotSchemaVersion, CURRENT_SCHEMA_VERSION)) {
          Logger.info(
            `[user:${userId}] Migrating snapshot from v${snapshotSchemaVersion} to v${CURRENT_SCHEMA_VERSION}`,
          );
          const migrationResult = migrateState(
            state,
            snapshotSchemaVersion,
            CURRENT_SCHEMA_VERSION,
          );
          if (!migrationResult.success) {
            throw new Error(`Snapshot migration failed: ${migrationResult.error}`);
          }
          state = migrationResult.data as Record<string, unknown>;
          snapshotSchemaVersion = CURRENT_SCHEMA_VERSION;
        }

        const totalOpsToProcess = latestSeq - startSeq;
        if (totalOpsToProcess > MAX_OPS_FOR_SNAPSHOT) {
          throw new Error(
            `Too many operations to process (${totalOpsToProcess}). ` +
              `Max: ${MAX_OPS_FOR_SNAPSHOT}.`,
          );
        }

        const BATCH_SIZE = 10000;
        let currentSeq = startSeq;
        let totalProcessed = 0;

        while (currentSeq < latestSeq) {
          const batchOps = await tx.operation.findMany({
            where: {
              userId,
              serverSeq: { gt: currentSeq },
            },
            orderBy: { serverSeq: 'asc' },
            take: BATCH_SIZE,
          });

          if (batchOps.length === 0) break;

          // Replay ops
          state = this.replayOpsToState(batchOps, state);

          currentSeq = batchOps[batchOps.length - 1].serverSeq;
          totalProcessed += batchOps.length;

          if (totalProcessed > MAX_OPS_FOR_SNAPSHOT) break;
        }

        const generatedAt = Date.now();

        // Update cache (we can do this async/outside, but doing it inside ensures it matches the returned state)
        // However, we are in a read-only-ish flow, but we can write to cache.
        // We'll call the update directly on tx.
        // Re-implementing cacheSnapshot logic for tx
        const compressed = zlib.gzipSync(JSON.stringify(state));
        if (compressed.length <= MAX_SNAPSHOT_SIZE_BYTES) {
          await tx.userSyncState.update({
            where: { userId },
            data: {
              snapshotData: compressed,
              lastSnapshotSeq: latestSeq,
              snapshotAt: BigInt(generatedAt),
              snapshotSchemaVersion: CURRENT_SCHEMA_VERSION,
            },
          });
        }

        return {
          state,
          serverSeq: latestSeq,
          generatedAt,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };
      },
      {
        timeout: 60000, // Snapshots can take time
      },
    );
  }

  // === Restore Points ===

  /**
   * Get available restore points for a user.
   * Returns significant state-change operations (SYNC_IMPORT, BACKUP_IMPORT, REPAIR)
   * which represent complete snapshots of the application state.
   */
  async getRestorePoints(
    userId: number,
    limit: number = 30,
  ): Promise<
    {
      serverSeq: number;
      timestamp: number;
      type: 'SYNC_IMPORT' | 'BACKUP_IMPORT' | 'REPAIR';
      clientId: string;
      description?: string;
    }[]
  > {
    // Query for full-state operations only
    const ops = await prisma.operation.findMany({
      where: {
        userId,
        opType: {
          in: ['SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR'],
        },
      },
      orderBy: {
        serverSeq: 'desc',
      },
      take: limit,
      select: {
        serverSeq: true,
        clientId: true,
        opType: true,
        clientTimestamp: true,
      },
    });

    return ops.map((op) => ({
      serverSeq: op.serverSeq,
      timestamp: Number(op.clientTimestamp),
      type: op.opType as 'SYNC_IMPORT' | 'BACKUP_IMPORT' | 'REPAIR',
      clientId: op.clientId,
      description: this._getRestorePointDescription(
        op.opType as 'SYNC_IMPORT' | 'BACKUP_IMPORT' | 'REPAIR',
      ),
    }));
  }

  private _getRestorePointDescription(
    opType: 'SYNC_IMPORT' | 'BACKUP_IMPORT' | 'REPAIR',
  ): string {
    switch (opType) {
      case 'SYNC_IMPORT':
        return 'Full sync import';
      case 'BACKUP_IMPORT':
        return 'Backup restore';
      case 'REPAIR':
        return 'Auto-repair';
      default:
        return 'State snapshot';
    }
  }

  /**
   * Generate a snapshot at a specific serverSeq.
   * Replays operations from the beginning (or cached snapshot) up to targetSeq.
   */
  async generateSnapshotAtSeq(
    userId: number,
    targetSeq: number,
  ): Promise<{
    state: unknown;
    serverSeq: number;
    generatedAt: number;
  }> {
    return prisma.$transaction(
      async (tx) => {
        // Verify targetSeq is valid
        const maxSeqRow = await tx.userSyncState.findUnique({
          where: { userId },
          select: { lastSeq: true },
        });
        const maxSeq = maxSeqRow?.lastSeq ?? 0;

        if (targetSeq > maxSeq) {
          throw new Error(
            `Target sequence ${targetSeq} exceeds latest sequence ${maxSeq}`,
          );
        }

        if (targetSeq < 1) {
          throw new Error('Target sequence must be at least 1');
        }

        let state: Record<string, unknown> = {};
        let startSeq = 0;

        // Try to use cached snapshot as base if it's before targetSeq
        const cachedRow = await tx.userSyncState.findUnique({
          where: { userId },
          select: {
            snapshotData: true,
            lastSnapshotSeq: true,
            snapshotSchemaVersion: true,
          },
        });

        if (
          cachedRow?.snapshotData &&
          cachedRow.lastSnapshotSeq &&
          cachedRow.lastSnapshotSeq <= targetSeq
        ) {
          try {
            const decompressed = zlib
              .gunzipSync(cachedRow.snapshotData, {
                maxOutputLength: MAX_SNAPSHOT_DECOMPRESSED_BYTES,
              })
              .toString('utf-8');
            state = JSON.parse(decompressed) as Record<string, unknown>;
            startSeq = cachedRow.lastSnapshotSeq;

            // Migrate if needed
            const snapshotSchemaVersion = cachedRow.snapshotSchemaVersion ?? 1;
            if (stateNeedsMigration(snapshotSchemaVersion, CURRENT_SCHEMA_VERSION)) {
              const migrationResult = migrateState(
                state,
                snapshotSchemaVersion,
                CURRENT_SCHEMA_VERSION,
              );
              if (migrationResult.success) {
                state = migrationResult.data as Record<string, unknown>;
              }
            }
          } catch (err) {
            // Ignore corrupted cache, start from scratch
            Logger.warn(
              `[user:${userId}] Failed to use cached snapshot: ${(err as Error).message}`,
            );
          }
        }

        const totalOpsToProcess = targetSeq - startSeq;
        if (totalOpsToProcess > MAX_OPS_FOR_SNAPSHOT) {
          throw new Error(
            `Too many operations to process (${totalOpsToProcess}). ` +
              `Max: ${MAX_OPS_FOR_SNAPSHOT}.`,
          );
        }

        // Check for encrypted ops in the range - server cannot replay encrypted payloads
        const encryptedOpCount = await tx.operation.count({
          where: {
            userId,
            serverSeq: { gt: startSeq, lte: targetSeq },
            isPayloadEncrypted: true,
          },
        });

        if (encryptedOpCount > 0) {
          throw new Error(
            `ENCRYPTED_OPS_NOT_SUPPORTED: Cannot generate snapshot - ${encryptedOpCount} operations have encrypted payloads. ` +
              `Server-side restore is not available when E2E encryption is enabled. ` +
              `Alternative: Use the client app's "Sync Now" button which can decrypt and restore locally.`,
          );
        }

        // Replay ops from startSeq to targetSeq
        const BATCH_SIZE = 10000;
        let currentSeq = startSeq;

        while (currentSeq < targetSeq) {
          const batchOps = await tx.operation.findMany({
            where: {
              userId,
              serverSeq: { gt: currentSeq, lte: targetSeq },
            },
            orderBy: { serverSeq: 'asc' },
            take: BATCH_SIZE,
          });

          if (batchOps.length === 0) break;

          state = this.replayOpsToState(batchOps, state);
          currentSeq = batchOps[batchOps.length - 1].serverSeq;
        }

        return {
          state,
          serverSeq: targetSeq,
          generatedAt: Date.now(),
        };
      },
      {
        timeout: 60000, // Snapshot generation can take time
      },
    );
  }

  private replayOpsToState(
    ops: PrismaOperation[],
    initialState: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const state = { ...(initialState as Record<string, Record<string, unknown>>) };

    for (let i = 0; i < ops.length; i++) {
      const row = ops[i];

      // Skip encrypted operations - server cannot decrypt E2E encrypted payloads
      // This is a defensive check; generateSnapshotAtSeq should reject encrypted ops upfront
      if (row.isPayloadEncrypted) {
        Logger.warn(
          `[replayOpsToState] Skipping encrypted op ${row.id} (seq=${row.serverSeq})`,
        );
        continue;
      }

      // Periodically check state size to prevent memory exhaustion
      if (i > 0 && i % REPLAY_SIZE_CHECK_INTERVAL === 0) {
        const estimatedSize = JSON.stringify(state).length;
        if (estimatedSize > MAX_REPLAY_STATE_SIZE_BYTES) {
          throw new Error(
            `State too large during replay: ${Math.round(estimatedSize / 1024 / 1024)}MB ` +
              `(max: ${Math.round(MAX_REPLAY_STATE_SIZE_BYTES / 1024 / 1024)}MB)`,
          );
        }
      }

      let opType = row.opType as Operation['opType'];
      let entityType = row.entityType;
      let entityId = row.entityId;
      let payload = row.payload;

      const opSchemaVersion = row.schemaVersion ?? 1;
      if (opSchemaVersion < CURRENT_SCHEMA_VERSION) {
        const opLike: OperationLike = {
          id: row.id,
          opType,
          entityType,
          entityId: entityId ?? undefined,
          payload,
          schemaVersion: opSchemaVersion,
        };

        const migrationResult = migrateOperation(opLike, CURRENT_SCHEMA_VERSION);
        if (!migrationResult.success) {
          continue;
        }
        const migratedOp = migrationResult.data;
        if (!migratedOp) continue;

        opType = migratedOp.opType as Operation['opType'];
        entityType = migratedOp.entityType;
        entityId = migratedOp.entityId ?? null;
        payload = migratedOp.payload as any;
      }

      if (!ALLOWED_ENTITY_TYPES.has(entityType)) continue;

      if (!state[entityType]) {
        state[entityType] = {};
      }

      switch (opType) {
        case 'CRT':
        case 'UPD':
          if (entityId) {
            state[entityType][entityId] = {
              ...(state[entityType][entityId] as Record<string, unknown>),
              ...(payload as Record<string, unknown>),
            };
          }
          break;
        case 'DEL':
          if (entityId) {
            delete state[entityType][entityId];
          }
          break;
        case 'MOV':
          if (entityId && payload) {
            state[entityType][entityId] = {
              ...(state[entityType][entityId] as Record<string, unknown>),
              ...(payload as Record<string, unknown>),
            };
          }
          break;
        case 'BATCH':
          if (payload && typeof payload === 'object') {
            const batchPayload = payload as Record<string, unknown>;
            if (batchPayload.entities && typeof batchPayload.entities === 'object') {
              const entities = batchPayload.entities as Record<string, unknown>;
              for (const [id, entity] of Object.entries(entities)) {
                state[entityType][id] = {
                  ...(state[entityType][id] as Record<string, unknown>),
                  ...(entity as Record<string, unknown>),
                };
              }
            } else if (entityId) {
              state[entityType][entityId] = {
                ...(state[entityType][entityId] as Record<string, unknown>),
                ...batchPayload,
              };
            }
          }
          break;
        case 'SYNC_IMPORT':
        case 'BACKUP_IMPORT':
        case 'REPAIR':
          if (payload && typeof payload === 'object' && 'appDataComplete' in payload) {
            Object.assign(
              state,
              (payload as { appDataComplete: unknown }).appDataComplete,
            );
          } else {
            Object.assign(state, payload);
          }
          break;
      }
    }
    return state;
  }

  // === Rate Limiting & Deduplication ===
  // Delegated to extracted services

  isRateLimited(userId: number): boolean {
    return this.rateLimitService.isRateLimited(userId);
  }

  cleanupExpiredRateLimitCounters(): number {
    return this.rateLimitService.cleanupExpiredCounters();
  }

  checkRequestDeduplication(userId: number, requestId: string): UploadResult[] | null {
    return this.requestDeduplicationService.checkDeduplication(userId, requestId);
  }

  cacheRequestResults(userId: number, requestId: string, results: UploadResult[]): void {
    this.requestDeduplicationService.cacheResults(userId, requestId, results);
  }

  cleanupExpiredRequestDedupEntries(): number {
    return this.requestDeduplicationService.cleanupExpiredEntries();
  }

  // === Storage Quota ===

  /**
   * Calculate actual storage usage for a user.
   * Includes operations table and snapshot data.
   */
  async calculateStorageUsage(userId: number): Promise<{
    operationsBytes: number;
    snapshotBytes: number;
    totalBytes: number;
  }> {
    // Use raw SQL for efficient aggregation of JSON payload sizes
    const opsResult = await prisma.$queryRaw<[{ total: bigint | null }]>`
      SELECT COALESCE(SUM(LENGTH(payload::text) + LENGTH(vector_clock::text)), 0) as total
      FROM operations WHERE user_id = ${userId}
    `;

    const snapshotResult = await prisma.userSyncState.findUnique({
      where: { userId },
      select: { snapshotData: true },
    });

    const operationsBytes = Number(opsResult[0]?.total ?? 0);
    const snapshotBytes = snapshotResult?.snapshotData?.length ?? 0;

    return {
      operationsBytes,
      snapshotBytes,
      totalBytes: operationsBytes + snapshotBytes,
    };
  }

  /**
   * Check if a user has quota available for additional storage.
   * Uses cached storageUsedBytes for performance.
   */
  async checkStorageQuota(
    userId: number,
    additionalBytes: number,
  ): Promise<{ allowed: boolean; currentUsage: number; quota: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuotaBytes: true, storageUsedBytes: true },
    });

    const quota = Number(user?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES);
    const currentUsage = Number(user?.storageUsedBytes ?? 0);

    return {
      allowed: currentUsage + additionalBytes <= quota,
      currentUsage,
      quota,
    };
  }

  /**
   * Update the cached storage usage for a user.
   * Called after successful uploads to keep the cache accurate.
   */
  async updateStorageUsage(userId: number): Promise<void> {
    const { totalBytes } = await this.calculateStorageUsage(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsedBytes: BigInt(totalBytes) },
    });
  }

  /**
   * Get storage quota and usage for a user.
   * Used by status endpoint.
   */
  async getStorageInfo(userId: number): Promise<{
    storageUsedBytes: number;
    storageQuotaBytes: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuotaBytes: true, storageUsedBytes: true },
    });

    return {
      storageUsedBytes: Number(user?.storageUsedBytes ?? 0),
      storageQuotaBytes: Number(user?.storageQuotaBytes ?? DEFAULT_STORAGE_QUOTA_BYTES),
    };
  }

  // === Cleanup ===

  async deleteExpiredTombstones(): Promise<number> {
    const result = await prisma.tombstone.deleteMany({
      where: {
        expiresAt: { lt: BigInt(Date.now()) },
      },
    });
    return result.count;
  }

  async deleteOldSyncedOpsForAllUsers(
    cutoffTime: number,
  ): Promise<{ totalDeleted: number; affectedUserIds: number[] }> {
    const states = await prisma.userSyncState.findMany({
      where: {
        lastSnapshotSeq: { not: null },
        snapshotAt: { not: null },
      },
      select: {
        userId: true,
        lastSnapshotSeq: true,
        snapshotAt: true,
      },
    });

    let totalDeleted = 0;
    const affectedUserIds: number[] = [];

    for (const state of states) {
      const snapshotAt = Number(state.snapshotAt);
      const lastSnapshotSeq = state.lastSnapshotSeq ?? 0;

      // Only prune ops that are both older than the retention window and covered by a snapshot
      if (snapshotAt >= cutoffTime && lastSnapshotSeq > 0) {
        const result = await prisma.operation.deleteMany({
          where: {
            userId: state.userId,
            serverSeq: { lte: lastSnapshotSeq },
            receivedAt: { lt: BigInt(cutoffTime) },
          },
        });
        if (result.count > 0) {
          totalDeleted += result.count;
          affectedUserIds.push(state.userId);
        }
      }
    }

    return { totalDeleted, affectedUserIds };
  }

  /**
   * Delete oldest restore point and all operations before it to free up storage.
   * Used when storage quota is exceeded to make room for new uploads.
   *
   * Strategy:
   * - If 2+ restore points: Delete oldest restore point AND all ops with serverSeq <= its seq
   * - If 1 restore point: Delete all ops with serverSeq < its seq (keep the restore point)
   * - If 0 restore points: Nothing to delete, return failure
   *
   * @returns Object with deletedCount, approximate freedBytes, and success flag
   */
  async deleteOldestRestorePointAndOps(
    userId: number,
  ): Promise<{ deletedCount: number; freedBytes: number; success: boolean }> {
    // Find all restore points (full-state operations) ordered by serverSeq ASC
    const restorePoints = await prisma.operation.findMany({
      where: {
        userId,
        opType: { in: ['SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR'] },
      },
      orderBy: { serverSeq: 'asc' },
      select: { serverSeq: true, opType: true },
    });

    if (restorePoints.length === 0) {
      Logger.warn(`[user:${userId}] No restore points found, cannot free storage`);
      return { deletedCount: 0, freedBytes: 0, success: false };
    }

    const oldestRestorePoint = restorePoints[0];
    let deleteUpToSeq: number;

    if (restorePoints.length >= 2) {
      // Delete the oldest restore point AND all ops up to and including it
      deleteUpToSeq = oldestRestorePoint.serverSeq;
      Logger.info(
        `[user:${userId}] Deleting oldest restore point (seq=${deleteUpToSeq}) and all ops before it`,
      );
    } else {
      // Only one restore point - delete all ops BEFORE it, but keep the restore point
      deleteUpToSeq = oldestRestorePoint.serverSeq - 1;
      Logger.info(
        `[user:${userId}] Keeping single restore point (seq=${oldestRestorePoint.serverSeq}), deleting ops before it`,
      );
    }

    if (deleteUpToSeq < 1) {
      Logger.info(`[user:${userId}] No ops to delete (deleteUpToSeq=${deleteUpToSeq})`);
      return { deletedCount: 0, freedBytes: 0, success: false };
    }

    // Calculate approximate size of ops being deleted
    const opsToDelete = await prisma.operation.findMany({
      where: {
        userId,
        serverSeq: { lte: deleteUpToSeq },
      },
      select: { payload: true, vectorClock: true },
    });

    const freedBytes = opsToDelete.reduce((sum, op) => {
      const payloadSize = op.payload ? JSON.stringify(op.payload).length : 0;
      const clockSize = op.vectorClock ? JSON.stringify(op.vectorClock).length : 0;
      return sum + payloadSize + clockSize;
    }, 0);

    // Delete the operations
    const result = await prisma.operation.deleteMany({
      where: {
        userId,
        serverSeq: { lte: deleteUpToSeq },
      },
    });

    if (result.count > 0) {
      // Clear stale snapshot cache if it references deleted operations
      const cachedRow = await prisma.userSyncState.findUnique({
        where: { userId },
        select: { lastSnapshotSeq: true },
      });

      if (cachedRow?.lastSnapshotSeq && cachedRow.lastSnapshotSeq <= deleteUpToSeq) {
        await prisma.userSyncState.update({
          where: { userId },
          data: {
            snapshotData: null,
            lastSnapshotSeq: null,
            snapshotAt: null,
          },
        });
        Logger.info(
          `[user:${userId}] Cleared stale snapshot cache (was at seq ${cachedRow.lastSnapshotSeq}, deleted up to ${deleteUpToSeq})`,
        );
      }

      // Update storage usage cache
      await this.updateStorageUsage(userId);
      Logger.info(
        `[user:${userId}] Deleted ${result.count} ops (freed ~${Math.round(freedBytes / 1024)}KB)`,
      );
    }

    return {
      deletedCount: result.count,
      freedBytes,
      success: result.count > 0,
    };
  }

  /**
   * Iteratively delete old restore points and operations until enough storage
   * space is available for the requested upload. Always keeps at least one
   * restore point and all operations after it (minimum valid sync state).
   *
   * @param userId - User ID
   * @param requiredBytes - Number of bytes needed for the upload
   * @returns Object with success status and cleanup statistics
   */
  async freeStorageForUpload(
    userId: number,
    requiredBytes: number,
  ): Promise<{
    success: boolean;
    freedBytes: number;
    deletedRestorePoints: number;
    deletedOps: number;
  }> {
    let totalFreedBytes = 0;
    let deletedRestorePoints = 0;
    let totalDeletedOps = 0;

    // Keep trying until we have enough space or hit minimum
    while (true) {
      // Check if we now have enough space
      const quotaCheck = await this.checkStorageQuota(userId, requiredBytes);
      if (quotaCheck.allowed) {
        return {
          success: true,
          freedBytes: totalFreedBytes,
          deletedRestorePoints,
          deletedOps: totalDeletedOps,
        };
      }

      // Count restore points remaining
      const restorePoints = await prisma.operation.findMany({
        where: {
          userId,
          opType: { in: ['SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR'] },
        },
        orderBy: { serverSeq: 'asc' },
        select: { serverSeq: true },
      });

      // Minimum: 1 restore point + all ops after it
      // If we only have 1 or fewer restore points, we can't delete any more
      if (restorePoints.length <= 1) {
        Logger.warn(
          `[user:${userId}] Cannot free more storage: only ${restorePoints.length} restore point(s) remaining`,
        );
        return {
          success: false,
          freedBytes: totalFreedBytes,
          deletedRestorePoints,
          deletedOps: totalDeletedOps,
        };
      }

      // Delete oldest restore point + all ops before it
      const result = await this.deleteOldestRestorePointAndOps(userId);
      if (!result.success) {
        return {
          success: false,
          freedBytes: totalFreedBytes,
          deletedRestorePoints,
          deletedOps: totalDeletedOps,
        };
      }

      totalFreedBytes += result.freedBytes;
      deletedRestorePoints++;
      totalDeletedOps += result.deletedCount;

      Logger.info(
        `[user:${userId}] Auto-cleanup iteration: freed ${Math.round(result.freedBytes / 1024)}KB, ` +
          `${restorePoints.length - 1} restore points remaining`,
      );
    }
  }

  async deleteStaleDevices(beforeTime: number): Promise<number> {
    const result = await prisma.syncDevice.deleteMany({
      where: {
        lastSeenAt: { lt: BigInt(beforeTime) },
      },
    });
    return result.count;
  }

  /**
   * Delete ALL sync data for a user. Used for encryption password changes.
   * Deletes operations, tombstones, devices, and resets sync state.
   */
  async deleteAllUserData(userId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete all operations
      await tx.operation.deleteMany({ where: { userId } });

      // Delete all tombstones
      await tx.tombstone.deleteMany({ where: { userId } });

      // Delete all devices
      await tx.syncDevice.deleteMany({ where: { userId } });

      // Reset sync state (delete if exists)
      await tx.userSyncState.deleteMany({ where: { userId } });

      // Reset storage usage
      await tx.user.update({
        where: { id: userId },
        data: { storageUsedBytes: BigInt(0) },
      });
    });

    // Clear caches
    this.rateLimitService.clearForUser(userId);
    this.snapshotGenerationLocks.delete(userId);
  }

  async isDeviceOwner(userId: number, clientId: string): Promise<boolean> {
    return this.deviceService.isDeviceOwner(userId, clientId);
  }

  async getAllUserIds(): Promise<number[]> {
    return this.deviceService.getAllUserIds();
  }

  async getOnlineDeviceCount(userId: number): Promise<number> {
    return this.deviceService.getOnlineDeviceCount(userId);
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export const getSyncService = (): SyncService => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
};

export const initSyncService = (config?: Partial<SyncConfig>): SyncService => {
  syncServiceInstance = new SyncService(config);
  return syncServiceInstance;
};
