import * as zlib from 'zlib';
import { prisma, Operation as PrismaOperation } from '../db';
import {
  Operation,
  ServerOperation,
  UploadResult,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  OP_TYPES,
  ONLINE_DEVICE_THRESHOLD_MS,
  validatePayload,
  compareVectorClocks,
  sanitizeVectorClock,
  VectorClock,
  SYNC_ERROR_CODES,
  SyncErrorCode,
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

/**
 * Valid entity types for operations.
 * Must match the EntityType union in the client's operation.types.ts.
 * Operations with unknown entity types will be rejected.
 */
const ALLOWED_ENTITY_TYPES = new Set([
  'TASK',
  'PROJECT',
  'TAG',
  'NOTE',
  'GLOBAL_CONFIG',
  'TIME_TRACKING',
  'SIMPLE_COUNTER',
  'WORK_CONTEXT',
  'TASK_REPEAT_CFG',
  'ISSUE_PROVIDER',
  'PLANNER',
  'MENU_TREE',
  'METRIC',
  'BOARD',
  'REMINDER',
  'MIGRATION',
  'RECOVERY',
  'ALL',
  'PLUGIN_USER_DATA',
  'PLUGIN_METADATA',
]);

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
 * Maximum decompressed snapshot size in bytes (100MB).
 * Prevents zip bombs from exhausting memory when reading cached snapshots.
 */
const MAX_SNAPSHOT_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

/**
 * Maximum entries in caches to prevent unbounded memory growth.
 * With ~200 bytes per entry, 10000 entries = ~2MB max memory per cache.
 */
const MAX_CACHE_SIZE = 10000;

/**
 * Tracks recently processed request IDs for deduplication.
 * Key format: "userId:requestId"
 */
interface RequestDeduplicationEntry {
  processedAt: number;
  results: UploadResult[];
}

export class SyncService {
  private config: SyncConfig;
  private rateLimitCounters: Map<number, { count: number; resetAt: number }> = new Map();

  /**
   * Cache of recently processed request IDs for deduplication.
   * Prevents duplicate processing when clients retry failed uploads.
   * Entries expire after 5 minutes.
   */
  private requestDeduplicationCache: Map<string, RequestDeduplicationEntry> = new Map();
  private readonly REQUEST_DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
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

    // Skip if no entityId (can't have entity-level conflicts)
    if (!op.entityId) {
      return { hasConflict: false };
    }

    // Get the latest operation for this entity
    const existingOp = await tx.operation.findFirst({
      where: {
        userId,
        entityType: op.entityType,
        entityId: op.entityId,
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

    // CONCURRENT or LESS_THAN means conflict
    if (comparison === 'CONCURRENT') {
      return {
        hasConflict: true,
        reason: `Concurrent modification detected for ${op.entityType}:${op.entityId}`,
        existingClock,
      };
    }

    // LESS_THAN means the incoming op is older than what we have
    if (comparison === 'LESS_THAN') {
      return {
        hasConflict: true,
        reason: `Stale operation: server has newer version of ${op.entityType}:${op.entityId}`,
        existingClock,
      };
    }

    return { hasConflict: false };
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
          // Serializable might be too strict/slow for Postgres, 'RepeatableRead' is often enough,
          // but for strict sequence consistency, we want to avoid gaps/races.
          // Default isolation level in Prisma is usually adequate (ReadCommitted).
          // However, to strictly serialize `getNextSeq` (last_seq increment), we rely on row locking of `user_sync_state`.
          // `tx.userSyncState.update` locks the row.
        },
      );
    } catch (err) {
      // Transaction failed - all operations were rolled back
      const errorMessage = (err as Error).message || 'Unknown error';
      Logger.error(`Transaction failed for user ${userId}: ${errorMessage}`);

      // Check if this is a timeout error (common for large payloads)
      const isTimeout =
        errorMessage.toLowerCase().includes('timeout') || errorMessage.includes('P2028'); // Prisma transaction timeout error code

      // Mark all "successful" results as failed due to transaction rollback
      // Include enough detail for client to determine if retry is appropriate
      return ops.map((op) => ({
        opId: op.id,
        accepted: false,
        error: isTimeout
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
      // Validate operation
      const validation = this.validateOp(op);
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

  async getOpsSince(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): Promise<ServerOperation[]> {
    const ops = await prisma.operation.findMany({
      where: {
        userId,
        serverSeq: { gt: sinceSeq },
        ...(excludeClient ? { clientId: { not: excludeClient } } : {}),
      },
      orderBy: {
        serverSeq: 'asc',
      },
      take: limit,
    });

    return ops.map((row) => ({
      serverSeq: row.serverSeq,
      op: {
        id: row.id,
        clientId: row.clientId,
        actionType: row.actionType,
        opType: row.opType as Operation['opType'],
        entityType: row.entityType,
        entityId: row.entityId ?? undefined,
        payload: row.payload,
        vectorClock: row.vectorClock as unknown as VectorClock,
        schemaVersion: row.schemaVersion,
        timestamp: Number(row.clientTimestamp),
        parentOpId: row.parentOpId ?? undefined,
        isPayloadEncrypted: row.isPayloadEncrypted,
      },
      receivedAt: Number(row.receivedAt),
    }));
  }

  /**
   * Get operations and latest sequence atomically with gap detection.
   */
  async getOpsSinceWithSeq(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): Promise<{ ops: ServerOperation[]; latestSeq: number; gapDetected: boolean }> {
    return prisma.$transaction(async (tx) => {
      const ops = await tx.operation.findMany({
        where: {
          userId,
          serverSeq: { gt: sinceSeq },
          ...(excludeClient ? { clientId: { not: excludeClient } } : {}),
        },
        orderBy: {
          serverSeq: 'asc',
        },
        take: limit,
      });

      const seqRow = await tx.userSyncState.findUnique({
        where: { userId },
        select: { lastSeq: true },
      });

      // Get min sequence efficiently
      const minSeqAgg = await tx.operation.aggregate({
        where: { userId },
        _min: { serverSeq: true },
      });

      const latestSeq = seqRow?.lastSeq ?? 0;
      const minSeq = minSeqAgg._min.serverSeq ?? null;

      // Gap detection logic
      let gapDetected = false;

      // Case 1: Client has history but server is empty
      if (sinceSeq > 0 && latestSeq === 0) {
        gapDetected = true;
        Logger.warn(
          `[user:${userId}] Gap detected: client at sinceSeq=${sinceSeq} but server is empty (latestSeq=0)`,
        );
      }

      // Case 2: Client is ahead of server
      if (sinceSeq > latestSeq && latestSeq > 0) {
        gapDetected = true;
        Logger.warn(
          `[user:${userId}] Gap detected: client ahead sinceSeq=${sinceSeq} > latestSeq=${latestSeq}`,
        );
      }

      if (sinceSeq > 0 && latestSeq > 0) {
        // Case 3: Requested seq is purged
        if (minSeq !== null && sinceSeq < minSeq - 1) {
          gapDetected = true;
          Logger.warn(
            `[user:${userId}] Gap detected: sinceSeq=${sinceSeq} but minSeq=${minSeq}`,
          );
        }

        // Case 4: Gap in returned operations
        if (!excludeClient && ops.length > 0 && ops[0].serverSeq > sinceSeq + 1) {
          gapDetected = true;
          Logger.warn(
            `[user:${userId}] Gap detected: expected seq ${sinceSeq + 1} but got ${ops[0].serverSeq}`,
          );
        }
      }

      const mappedOps = ops.map((row) => ({
        serverSeq: row.serverSeq,
        op: {
          id: row.id,
          clientId: row.clientId,
          actionType: row.actionType,
          opType: row.opType as Operation['opType'],
          entityType: row.entityType,
          entityId: row.entityId ?? undefined,
          payload: row.payload,
          vectorClock: row.vectorClock as unknown as VectorClock,
          schemaVersion: row.schemaVersion,
          timestamp: Number(row.clientTimestamp),
          parentOpId: row.parentOpId ?? undefined,
          isPayloadEncrypted: row.isPayloadEncrypted,
        },
        receivedAt: Number(row.receivedAt),
      }));

      return { ops: mappedOps, latestSeq, gapDetected };
    });
  }

  async getLatestSeq(userId: number): Promise<number> {
    const row = await prisma.userSyncState.findUnique({
      where: { userId },
      select: { lastSeq: true },
    });
    return row?.lastSeq ?? 0;
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

  private replayOpsToState(
    ops: PrismaOperation[],
    initialState: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const state = { ...(initialState as Record<string, Record<string, unknown>>) };

    for (const row of ops) {
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
  // (Logic remains largely same, just memory structures)

  isRateLimited(userId: number): boolean {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(userId);
    const limit = this.config.uploadRateLimit;

    if (!counter || now > counter.resetAt) {
      if (this.rateLimitCounters.size >= MAX_CACHE_SIZE) {
        const firstKey = this.rateLimitCounters.keys().next().value;
        if (firstKey !== undefined) this.rateLimitCounters.delete(firstKey);
      }
      this.rateLimitCounters.set(userId, { count: 1, resetAt: now + limit.windowMs });
      return false;
    }

    if (counter.count >= limit.max) return true;
    counter.count++;
    return false;
  }

  cleanupExpiredRateLimitCounters(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [userId, counter] of this.rateLimitCounters) {
      if (now > counter.resetAt) {
        this.rateLimitCounters.delete(userId);
        cleaned++;
      }
    }
    return cleaned;
  }

  checkRequestDeduplication(userId: number, requestId: string): UploadResult[] | null {
    const key = `${userId}:${requestId}`;
    const entry = this.requestDeduplicationCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.processedAt > this.REQUEST_DEDUP_TTL_MS) {
      this.requestDeduplicationCache.delete(key);
      return null;
    }
    return entry.results;
  }

  cacheRequestResults(userId: number, requestId: string, results: UploadResult[]): void {
    const key = `${userId}:${requestId}`;
    if (this.requestDeduplicationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.requestDeduplicationCache.keys().next().value;
      if (firstKey) this.requestDeduplicationCache.delete(firstKey);
    }
    this.requestDeduplicationCache.set(key, { processedAt: Date.now(), results });
  }

  cleanupExpiredRequestDedupEntries(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.requestDeduplicationCache) {
      if (now - entry.processedAt > this.REQUEST_DEDUP_TTL_MS) {
        this.requestDeduplicationCache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
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

  async deleteOldSyncedOpsForAllUsers(cutoffTime: number): Promise<number> {
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
        totalDeleted += result.count;
      }
    }

    return totalDeleted;
  }

  async deleteStaleDevices(beforeTime: number): Promise<number> {
    const result = await prisma.syncDevice.deleteMany({
      where: {
        lastSeenAt: { lt: BigInt(beforeTime) },
      },
    });
    return result.count;
  }

  async isDeviceOwner(userId: number, clientId: string): Promise<boolean> {
    const count = await prisma.syncDevice.count({
      where: { userId, clientId },
    });
    return count > 0;
  }

  async getAllUserIds(): Promise<number[]> {
    const users = await prisma.userSyncState.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    return users.map((u) => u.userId);
  }

  async getOnlineDeviceCount(userId: number): Promise<number> {
    const threshold = Date.now() - ONLINE_DEVICE_THRESHOLD_MS;
    const count = await prisma.syncDevice.count({
      where: {
        userId,
        lastSeenAt: { gt: BigInt(threshold) },
      },
    });
    return count;
  }

  // === Validation ===

  private validateOp(op: Operation): {
    valid: boolean;
    error?: string;
    errorCode?: SyncErrorCode;
  } {
    if (!op.id || typeof op.id !== 'string') {
      return {
        valid: false,
        error: 'Invalid operation ID',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_ID,
      };
    }
    if (op.id.length > 255) {
      return {
        valid: false,
        error: 'Operation ID too long',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_ID,
      };
    }
    if (!op.opType || !OP_TYPES.includes(op.opType)) {
      return {
        valid: false,
        error: 'Invalid opType',
        errorCode: SYNC_ERROR_CODES.INVALID_OP_TYPE,
      };
    }
    if (!op.entityType) {
      return {
        valid: false,
        error: 'Missing entityType',
        errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_TYPE,
      };
    }
    if (!ALLOWED_ENTITY_TYPES.has(op.entityType)) {
      return {
        valid: false,
        error: `Invalid entityType: ${op.entityType}`,
        errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_TYPE,
      };
    }
    if (op.entityId !== undefined && op.entityId !== null) {
      if (typeof op.entityId !== 'string' || op.entityId.length > 255) {
        return {
          valid: false,
          error: 'Invalid entityId format or length',
          errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_ID,
        };
      }
    }
    if (op.opType === 'DEL' && !op.entityId) {
      return {
        valid: false,
        error: 'DEL operation requires entityId',
        errorCode: SYNC_ERROR_CODES.MISSING_ENTITY_ID,
      };
    }
    if (op.payload === undefined) {
      return {
        valid: false,
        error: 'Missing payload',
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }
    if (op.schemaVersion !== undefined) {
      if (op.schemaVersion < 1 || op.schemaVersion > 100) {
        return {
          valid: false,
          error: `Invalid schema version: ${op.schemaVersion}`,
          errorCode: SYNC_ERROR_CODES.INVALID_SCHEMA_VERSION,
        };
      }
    }

    const clockValidation = sanitizeVectorClock(op.vectorClock);
    if (!clockValidation.valid) {
      return {
        valid: false,
        error: clockValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_VECTOR_CLOCK,
      };
    }
    op.vectorClock = clockValidation.clock;

    const isFullStateOp =
      op.opType === 'SYNC_IMPORT' ||
      op.opType === 'BACKUP_IMPORT' ||
      op.opType === 'REPAIR';
    if (!isFullStateOp && !this.validatePayloadComplexity(op.payload)) {
      return {
        valid: false,
        error: 'Payload too complex (max depth 20, max keys 20000)',
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    const payloadSize = JSON.stringify(op.payload).length;
    if (payloadSize > this.config.maxPayloadSizeBytes) {
      return {
        valid: false,
        error: 'Payload too large',
        errorCode: SYNC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      };
    }

    const payloadValidation = validatePayload(op.opType, op.payload);
    if (!payloadValidation.valid) {
      return {
        valid: false,
        error: payloadValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    const now = Date.now();
    if (op.timestamp > now + this.config.maxClockDriftMs) {
      return {
        valid: false,
        error: 'Timestamp too far in future',
        errorCode: SYNC_ERROR_CODES.INVALID_TIMESTAMP,
      };
    }
    if (op.timestamp < now - this.config.maxOpAgeMs) {
      return {
        valid: false,
        error: 'Operation too old',
        errorCode: SYNC_ERROR_CODES.INVALID_TIMESTAMP,
      };
    }

    return { valid: true };
  }

  private validatePayloadComplexity(
    payload: unknown,
    maxDepth: number = 20,
    maxKeys: number = 20000,
  ): boolean {
    let totalKeys = 0;

    const checkDepth = (obj: unknown, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (obj === null || typeof obj !== 'object') return true;

      if (Array.isArray(obj)) {
        totalKeys += obj.length;
        if (totalKeys > maxKeys) return false;
        return obj.every((item) => checkDepth(item, depth + 1));
      }

      const keys = Object.keys(obj);
      totalKeys += keys.length;
      if (totalKeys > maxKeys) return false;

      return keys.every((key) =>
        checkDepth((obj as Record<string, unknown>)[key], depth + 1),
      );
    };

    return checkDepth(payload, 0);
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
