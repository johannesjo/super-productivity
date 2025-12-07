import Database from 'better-sqlite3';
import * as zlib from 'zlib';
import { getDb, DbOperation } from '../db';
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

interface PreparedStatements {
  insertOp: Database.Statement;
  getNextSeq: Database.Statement;
  initUserSeq: Database.Statement;
  getOpsSince: Database.Statement;
  getOpsSinceExcludeClient: Database.Statement;
  updateDevice: Database.Statement;
  getLatestSeq: Database.Statement;
  getCachedSnapshot: Database.Statement;
  cacheSnapshot: Database.Statement;
  getAllOps: Database.Statement;
  insertTombstone: Database.Statement;
  getTombstone: Database.Statement;
  deleteExpiredTombstones: Database.Statement;
  deleteOldSyncedOpsForAllUsers: Database.Statement;
  deleteStaleDevices: Database.Statement;
  getAllUserIds: Database.Statement;
  getOnlineDeviceCount: Database.Statement;
  getLatestOpForEntity: Database.Statement;
  getMinServerSeq: Database.Statement;
  getDevice: Database.Statement;
}

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
  private db: Database.Database;
  private stmts!: PreparedStatements;
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
    this.db = getDb();
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.prepareStatements();
  }

  private prepareStatements(): void {
    this.stmts = {
      insertOp: this.db.prepare(`
        INSERT INTO operations (
          id, user_id, client_id, server_seq, action_type, op_type,
          entity_type, entity_id, payload, vector_clock, schema_version,
          client_timestamp, received_at, parent_op_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),

      getNextSeq: this.db.prepare(`
        UPDATE user_sync_state
        SET last_seq = last_seq + 1
        WHERE user_id = ?
        RETURNING last_seq
      `),

      initUserSeq: this.db.prepare(`
        INSERT OR IGNORE INTO user_sync_state (user_id, last_seq)
        VALUES (?, 0)
      `),

      getOpsSince: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ? AND server_seq > ?
        ORDER BY server_seq ASC
        LIMIT ?
      `),

      getOpsSinceExcludeClient: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ? AND server_seq > ? AND client_id != ?
        ORDER BY server_seq ASC
        LIMIT ?
      `),

      updateDevice: this.db.prepare(`
        INSERT INTO sync_devices (client_id, user_id, last_seen_at, last_acked_seq, created_at)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(user_id, client_id) DO UPDATE SET
          last_seen_at = excluded.last_seen_at
      `),

      getLatestSeq: this.db.prepare(`
        SELECT last_seq FROM user_sync_state WHERE user_id = ?
      `),

      getCachedSnapshot: this.db.prepare(`
        SELECT snapshot_data, last_snapshot_seq, snapshot_at, snapshot_schema_version
        FROM user_sync_state WHERE user_id = ?
      `),

      cacheSnapshot: this.db.prepare(`
        UPDATE user_sync_state
        SET snapshot_data = ?, last_snapshot_seq = ?, snapshot_at = ?, snapshot_schema_version = ?
        WHERE user_id = ?
      `),

      getAllOps: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ?
        ORDER BY server_seq ASC
      `),

      insertTombstone: this.db.prepare(`
        INSERT OR REPLACE INTO tombstones
        (user_id, entity_type, entity_id, deleted_at, deleted_by_op_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `),

      getTombstone: this.db.prepare(`
        SELECT * FROM tombstones
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      `),

      deleteExpiredTombstones: this.db.prepare(`
        DELETE FROM tombstones WHERE expires_at < ?
      `),

      // Time-based cleanup: delete operations older than threshold (90 days).
      // Simpler than ACK-based cleanup - just delete old ops regardless of device status.
      deleteOldSyncedOpsForAllUsers: this.db.prepare(`
        DELETE FROM operations WHERE received_at < ?
      `),

      deleteStaleDevices: this.db.prepare(`
        DELETE FROM sync_devices WHERE last_seen_at < ?
      `),

      getAllUserIds: this.db.prepare(`
        SELECT DISTINCT user_id FROM user_sync_state
      `),

      getOnlineDeviceCount: this.db.prepare(`
        SELECT COUNT(*) as count FROM sync_devices
        WHERE user_id = ? AND last_seen_at > ?
      `),

      // Get the most recent operation for a specific entity (for conflict detection)
      getLatestOpForEntity: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ? AND entity_type = ? AND entity_id = ?
        ORDER BY server_seq DESC
        LIMIT 1
      `),

      // Get minimum server_seq for a user (for gap detection)
      getMinServerSeq: this.db.prepare(`
        SELECT MIN(server_seq) as min_seq FROM operations WHERE user_id = ?
      `),

      // Get device by user and client ID (for ownership validation)
      getDevice: this.db.prepare(`
        SELECT 1 FROM sync_devices WHERE user_id = ? AND client_id = ?
      `),
    };
  }

  // === Conflict Detection ===

  /**
   * Check if an incoming operation conflicts with existing operations.
   * Returns conflict info if a concurrent modification is detected.
   *
   * Conflict detection rules:
   * - Only entity-specific ops (with entityId) can conflict
   * - SYNC_IMPORT, BACKUP_IMPORT, REPAIR bypass conflict detection (full state operations)
   * - UPD/DEL/MOV on an entity with a concurrent vector clock is a conflict
   */
  private detectConflict(
    userId: number,
    op: Operation,
  ): { hasConflict: boolean; reason?: string; existingClock?: VectorClock } {
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
    const existingOp = this.stmts.getLatestOpForEntity.get(
      userId,
      op.entityType,
      op.entityId,
    ) as DbOperation | undefined;

    // No existing operation = no conflict
    if (!existingOp) {
      return { hasConflict: false };
    }

    // Parse the existing operation's vector clock
    const existingClock = JSON.parse(existingOp.vector_clock) as VectorClock;

    // Compare vector clocks
    const comparison = compareVectorClocks(op.vectorClock, existingClock);

    // If the incoming op's clock is GREATER_THAN existing, it's a valid successor
    if (comparison === 'GREATER_THAN') {
      return { hasConflict: false };
    }

    // If clocks are EQUAL, this might be a retry of the same operation - check if from same client
    if (comparison === 'EQUAL' && op.clientId === existingOp.client_id) {
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

  uploadOps(userId: number, clientId: string, ops: Operation[]): UploadResult[] {
    const results: UploadResult[] = [];
    const now = Date.now();

    // Ensure user has sync state row
    this.stmts.initUserSeq.run(userId);

    // Use immediate mode to acquire write lock upfront (prevents deadlocks)
    // Process each operation individually within the transaction
    const tx = this.db.transaction(() => {
      for (const op of ops) {
        const result = this.processOperation(userId, clientId, op, now);
        results.push(result);
      }

      // Update device last seen
      this.stmts.updateDevice.run(clientId, userId, now, now);
    });

    try {
      tx.immediate();
    } catch (err) {
      // Transaction failed - all operations were rolled back
      // Return error results for all operations that appeared successful
      Logger.error(`Transaction failed for user ${userId}: ${(err as Error).message}`);

      // Mark all "successful" results as failed due to transaction rollback
      return ops.map((op) => ({
        opId: op.id,
        accepted: false,
        error: 'Transaction rolled back due to internal error',
        errorCode: SYNC_ERROR_CODES.INTERNAL_ERROR,
      }));
    }

    return results;
  }

  /**
   * Process a single operation within a transaction.
   * Handles validation, conflict detection, and persistence.
   * Never throws - returns error result instead.
   */
  private processOperation(
    userId: number,
    clientId: string,
    op: Operation,
    now: number,
  ): UploadResult {
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
      const conflict = this.detectConflict(userId, op);
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
      const row = this.stmts.getNextSeq.get(userId) as { last_seq: number };
      const serverSeq = row.last_seq;

      // Insert operation
      this.stmts.insertOp.run(
        op.id,
        userId,
        clientId,
        serverSeq,
        op.actionType,
        op.opType,
        op.entityType,
        op.entityId ?? null,
        JSON.stringify(op.payload),
        JSON.stringify(op.vectorClock),
        op.schemaVersion,
        op.timestamp,
        now,
        op.parentOpId ?? null,
      );

      // Create tombstone for delete operations
      if (op.opType === 'DEL' && op.entityId) {
        this.createTombstoneSync(userId, op.entityType, op.entityId, op.id);
      }

      return {
        opId: op.id,
        accepted: true,
        serverSeq,
      };
    } catch (err: unknown) {
      // Duplicate ID (already processed) - idempotency
      // Use SQLite error code for reliable detection instead of string matching
      const sqliteError = err as { code?: string };
      if (
        sqliteError?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
        sqliteError?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        sqliteError?.code === 'SQLITE_CONSTRAINT'
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

  private createTombstoneSync(
    userId: number,
    entityType: string,
    entityId: string,
    deletedByOpId: string,
  ): void {
    const now = Date.now();
    const expiresAt = now + this.config.tombstoneRetentionMs;

    this.stmts.insertTombstone.run(
      userId,
      entityType,
      entityId,
      now,
      deletedByOpId,
      expiresAt,
    );
  }

  // === Download Operations ===

  /**
   * Get operations since a sequence number.
   * This is wrapped in a transaction to ensure snapshot isolation.
   * Without transaction isolation, the latestSeq could be incremented
   * between reading ops and returning the response, causing clients to miss operations.
   */
  getOpsSince(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): ServerOperation[] {
    // Use transaction for snapshot isolation
    const tx = this.db.transaction(() => {
      const stmt = excludeClient
        ? this.stmts.getOpsSinceExcludeClient
        : this.stmts.getOpsSince;

      const args = excludeClient
        ? [userId, sinceSeq, excludeClient, limit]
        : [userId, sinceSeq, limit];

      return stmt.all(...args) as DbOperation[];
    });

    const rows = tx();

    return rows.map((row) => ({
      serverSeq: row.server_seq,
      op: {
        id: row.id,
        clientId: row.client_id,
        actionType: row.action_type,
        opType: row.op_type as Operation['opType'],
        entityType: row.entity_type,
        entityId: row.entity_id ?? undefined,
        payload: JSON.parse(row.payload),
        vectorClock: JSON.parse(row.vector_clock),
        schemaVersion: row.schema_version,
        timestamp: row.client_timestamp,
        parentOpId: row.parent_op_id ?? undefined,
      },
      receivedAt: row.received_at,
    }));
  }

  /**
   * Get operations and latest sequence atomically with gap detection.
   * Uses transaction to ensure the latestSeq matches the returned operations.
   *
   * Gap detection rules:
   * 1. If sinceSeq > 0 and the first returned op's seq != sinceSeq + 1, there's a gap
   * 2. If sinceSeq is older than our oldest retained operation, there's a gap
   * 3. If sinceSeq > latestSeq, the client is ahead (should not happen, but handle gracefully)
   */
  getOpsSinceWithSeq(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): { ops: ServerOperation[]; latestSeq: number; gapDetected: boolean } {
    const tx = this.db.transaction(() => {
      const stmt = excludeClient
        ? this.stmts.getOpsSinceExcludeClient
        : this.stmts.getOpsSince;

      const args = excludeClient
        ? [userId, sinceSeq, excludeClient, limit]
        : [userId, sinceSeq, limit];

      const rows = stmt.all(...args) as DbOperation[];
      const seqRow = this.stmts.getLatestSeq.get(userId) as
        | { last_seq: number }
        | undefined;
      const minSeqRow = this.stmts.getMinServerSeq.get(userId) as
        | { min_seq: number | null }
        | undefined;

      return {
        rows,
        latestSeq: seqRow?.last_seq ?? 0,
        minSeq: minSeqRow?.min_seq ?? null,
      };
    });

    const { rows, latestSeq, minSeq } = tx();

    // Gap detection logic
    let gapDetected = false;

    if (sinceSeq > 0 && latestSeq > 0) {
      // If we requested ops since a sequence, but the minimum retained op is higher,
      // operations have been purged and there's a gap
      if (minSeq !== null && sinceSeq < minSeq - 1) {
        gapDetected = true;
        Logger.warn(
          `[user:${userId}] Gap detected: sinceSeq=${sinceSeq} but minSeq=${minSeq}`,
        );
      }

      // If we got ops but the first one doesn't immediately follow sinceSeq,
      // there's a gap (unless we're excluding a client and they created the gap)
      if (!excludeClient && rows.length > 0 && rows[0].server_seq > sinceSeq + 1) {
        gapDetected = true;
        Logger.warn(
          `[user:${userId}] Gap detected: expected seq ${sinceSeq + 1} but got ${rows[0].server_seq}`,
        );
      }
    }

    const ops = rows.map((row) => ({
      serverSeq: row.server_seq,
      op: {
        id: row.id,
        clientId: row.client_id,
        actionType: row.action_type,
        opType: row.op_type as Operation['opType'],
        entityType: row.entity_type,
        entityId: row.entity_id ?? undefined,
        payload: JSON.parse(row.payload),
        vectorClock: JSON.parse(row.vector_clock),
        schemaVersion: row.schema_version,
        timestamp: row.client_timestamp,
        parentOpId: row.parent_op_id ?? undefined,
      },
      receivedAt: row.received_at,
    }));

    return { ops, latestSeq, gapDetected };
  }

  getLatestSeq(userId: number): number {
    const row = this.stmts.getLatestSeq.get(userId) as { last_seq: number } | undefined;
    return row?.last_seq ?? 0;
  }

  // === Snapshot Management ===

  getCachedSnapshot(userId: number): {
    state: unknown;
    serverSeq: number;
    generatedAt: number;
    schemaVersion: number;
  } | null {
    const row = this.stmts.getCachedSnapshot.get(userId) as
      | {
          snapshot_data: Buffer | null;
          last_snapshot_seq: number | null;
          snapshot_at: number | null;
          snapshot_schema_version: number | null;
        }
      | undefined;

    if (!row?.snapshot_data) return null;

    // Decompress snapshot
    const decompressed = zlib.gunzipSync(row.snapshot_data).toString('utf-8');
    return {
      state: JSON.parse(decompressed),
      serverSeq: row.last_snapshot_seq ?? 0,
      generatedAt: row.snapshot_at ?? 0,
      schemaVersion: row.snapshot_schema_version ?? 1,
    };
  }

  cacheSnapshot(userId: number, state: unknown, serverSeq: number): void {
    const now = Date.now();
    // Compress snapshot to reduce storage
    const compressed = zlib.gzipSync(JSON.stringify(state));

    // Enforce size limit to prevent storage exhaustion
    if (compressed.length > MAX_SNAPSHOT_SIZE_BYTES) {
      Logger.error(
        `[user:${userId}] Snapshot too large: ${compressed.length} bytes ` +
          `(max ${MAX_SNAPSHOT_SIZE_BYTES}). Skipping cache.`,
      );
      return;
    }

    // Store with current schema version
    this.stmts.cacheSnapshot.run(
      compressed,
      serverSeq,
      now,
      CURRENT_SCHEMA_VERSION,
      userId,
    );
  }

  generateSnapshot(userId: number): {
    state: unknown;
    serverSeq: number;
    generatedAt: number;
    schemaVersion: number;
  } {
    // Wrap in transaction for snapshot isolation - prevents race conditions
    // where new ops arrive between reading latestSeq and processing ops
    const tx = this.db.transaction(() => {
      const latestSeq = this.getLatestSeq(userId);
      let state: Record<string, unknown> = {};
      let startSeq = 0;
      let snapshotSchemaVersion = CURRENT_SCHEMA_VERSION;

      // Try to get cached snapshot to build upon (Incremental Snapshot)
      const cached = this.getCachedSnapshot(userId);
      if (cached) {
        state = cached.state as Record<string, unknown>;
        startSeq = cached.serverSeq;
        snapshotSchemaVersion = cached.schemaVersion;
      }

      // If we are already up to date AND at current schema version, return cached
      if (
        startSeq >= latestSeq &&
        cached &&
        snapshotSchemaVersion === CURRENT_SCHEMA_VERSION
      ) {
        return {
          state: cached.state,
          serverSeq: cached.serverSeq,
          generatedAt: Date.now(), // Refresh timestamp
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };
      }

      // Migrate snapshot if it's from an older schema version
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
          Logger.error(
            `[user:${userId}] Snapshot migration failed: ${migrationResult.error}`,
          );
          throw new Error(`Snapshot migration failed: ${migrationResult.error}`);
        }
        state = migrationResult.data as Record<string, unknown>;
        snapshotSchemaVersion = CURRENT_SCHEMA_VERSION;
      }

      // Safety check: prevent memory exhaustion for excessive operation counts
      const totalOpsToProcess = latestSeq - startSeq;
      if (totalOpsToProcess > MAX_OPS_FOR_SNAPSHOT) {
        Logger.error(
          `Snapshot generation for user ${userId} requires ${totalOpsToProcess} ops ` +
            `(max ${MAX_OPS_FOR_SNAPSHOT}). Consider implementing data archival.`,
        );
        throw new Error(
          `Too many operations to process (${totalOpsToProcess}). ` +
            `Maximum allowed: ${MAX_OPS_FOR_SNAPSHOT}. Contact support for data archival.`,
        );
      }

      // Process operations in batches to avoid memory issues
      const BATCH_SIZE = 10000;
      let currentSeq = startSeq;
      let totalProcessed = 0;

      while (currentSeq < latestSeq) {
        const batchOps = this.stmts.getOpsSince.all(
          userId,
          currentSeq,
          BATCH_SIZE,
        ) as DbOperation[];

        if (batchOps.length === 0) break;

        // Replay this batch (operations are migrated during replay)
        state = this.replayOpsToState(batchOps, state);

        // Update currentSeq to the last processed operation
        currentSeq = batchOps[batchOps.length - 1].server_seq;
        totalProcessed += batchOps.length;

        // Double-check bounds during processing (defensive)
        if (totalProcessed > MAX_OPS_FOR_SNAPSHOT) {
          Logger.error(`Snapshot generation exceeded max ops limit during processing`);
          break;
        }
      }

      const generatedAt = Date.now();

      // Cache the new snapshot
      this.cacheSnapshot(userId, state, latestSeq);

      return {
        state,
        serverSeq: latestSeq,
        generatedAt,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
    });

    return tx();
  }

  private replayOpsToState(
    ops: DbOperation[],
    initialState: Record<string, unknown> = {},
  ): Record<string, unknown> {
    // Clone initial state to avoid mutation if needed (though we assign to it)
    // We cast it to our working structure
    const state = { ...(initialState as Record<string, Record<string, unknown>>) };

    // Apply operations in order
    for (const row of ops) {
      let opType = row.op_type;
      let entityType = row.entity_type;
      let entityId = row.entity_id;
      let payload = JSON.parse(row.payload);

      // Migrate operation if it's from an older schema version
      const opSchemaVersion = row.schema_version ?? 1;
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
          Logger.warn(
            `Operation migration failed for ${row.id}: ${migrationResult.error}. Skipping.`,
          );
          continue;
        }

        const migratedOp = migrationResult.data;
        if (migratedOp === null || migratedOp === undefined) {
          // Operation was dropped during migration (e.g., removed feature)
          Logger.info(`Operation ${row.id} dropped during migration (feature removed)`);
          continue;
        }

        // Use migrated values
        opType = migratedOp.opType;
        entityType = migratedOp.entityType;
        entityId = migratedOp.entityId ?? null;
        payload = migratedOp.payload;
      }

      // Skip operations with invalid entity types (defensive)
      if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
        Logger.warn(`Skipping operation with invalid entity type: ${entityType}`);
        continue;
      }

      // Initialize entity type if needed
      if (!state[entityType]) {
        state[entityType] = {};
      }

      switch (opType) {
        case 'CRT':
        case 'UPD':
          if (entityId) {
            state[entityType][entityId] = {
              ...(state[entityType][entityId] as Record<string, unknown>),
              ...payload,
            };
          }
          break;
        case 'DEL':
          if (entityId) {
            delete state[entityType][entityId];
          }
          break;
        case 'MOV':
          // Move operations typically contain reordering info in payload
          // Apply any payload changes (e.g., updated parent, order)
          if (entityId && payload) {
            state[entityType][entityId] = {
              ...(state[entityType][entityId] as Record<string, unknown>),
              ...payload,
            };
          }
          break;
        case 'BATCH':
          // Batch operations can contain updates to multiple entities
          // The payload structure depends on the batch type
          if (payload && typeof payload === 'object') {
            // If payload has entities keyed by ID, apply them
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
              // Single entity batch update
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
          // Full state import - replace everything
          // Handle wrapped payloads (REPAIR always has appDataComplete, others might)
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

  // === Rate Limiting ===

  isRateLimited(userId: number): boolean {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(userId);
    const limit = this.config.uploadRateLimit;

    if (!counter || now > counter.resetAt) {
      // Enforce cache size limit (FIFO eviction) before adding
      if (this.rateLimitCounters.size >= MAX_CACHE_SIZE) {
        const firstKey = this.rateLimitCounters.keys().next().value;
        if (firstKey !== undefined) {
          this.rateLimitCounters.delete(firstKey);
        }
      }

      this.rateLimitCounters.set(userId, {
        count: 1,
        resetAt: now + limit.windowMs,
      });
      return false;
    }

    if (counter.count >= limit.max) {
      return true;
    }

    counter.count++;
    return false;
  }

  /**
   * Clean up expired rate limit counters to prevent memory leaks.
   * Should be called periodically (e.g., hourly).
   */
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

  // === Request Deduplication ===

  /**
   * Check if a request has already been processed.
   * Returns the cached results if found, or null if new request.
   */
  checkRequestDeduplication(userId: number, requestId: string): UploadResult[] | null {
    const key = `${userId}:${requestId}`;
    const entry = this.requestDeduplicationCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.processedAt > this.REQUEST_DEDUP_TTL_MS) {
      this.requestDeduplicationCache.delete(key);
      return null;
    }

    Logger.debug(
      `[user:${userId}] Request ${requestId} already processed, returning cached results`,
    );
    return entry.results;
  }

  /**
   * Store results for a processed request ID.
   * Enforces cache size limit by removing oldest entries when full.
   */
  cacheRequestResults(userId: number, requestId: string, results: UploadResult[]): void {
    const key = `${userId}:${requestId}`;

    // Enforce cache size limit (FIFO eviction)
    if (this.requestDeduplicationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.requestDeduplicationCache.keys().next().value;
      if (firstKey) {
        this.requestDeduplicationCache.delete(firstKey);
      }
    }

    this.requestDeduplicationCache.set(key, {
      processedAt: Date.now(),
      results,
    });
  }

  /**
   * Clean up expired request deduplication entries.
   * Should be called periodically (same schedule as rate limit cleanup).
   */
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

  // === Tombstone Management ===

  isTombstoned(userId: number, entityType: string, entityId: string): boolean {
    const row = this.stmts.getTombstone.get(userId, entityType, entityId);
    return !!row;
  }

  // === Cleanup ===

  deleteExpiredTombstones(): number {
    const result = this.stmts.deleteExpiredTombstones.run(Date.now());
    return result.changes;
  }

  /**
   * Deletes all operations older than cutoffTime (time-based cleanup).
   * Simple approach: old ops are cleaned up after 90 days regardless of device status.
   */
  deleteOldSyncedOpsForAllUsers(cutoffTime: number): number {
    const result = this.stmts.deleteOldSyncedOpsForAllUsers.run(cutoffTime);
    return result.changes;
  }

  deleteStaleDevices(beforeTime: number): number {
    const result = this.stmts.deleteStaleDevices.run(beforeTime);
    return result.changes;
  }

  /**
   * Check if a device belongs to a user.
   */
  isDeviceOwner(userId: number, clientId: string): boolean {
    const row = this.stmts.getDevice.get(userId, clientId);
    return !!row;
  }

  getAllUserIds(): number[] {
    const rows = this.stmts.getAllUserIds.all() as { user_id: number }[];
    return rows.map((r) => r.user_id);
  }

  // === Status ===

  getOnlineDeviceCount(userId: number): number {
    const threshold = Date.now() - ONLINE_DEVICE_THRESHOLD_MS;
    const row = this.stmts.getOnlineDeviceCount.get(userId, threshold) as
      | { count: number }
      | undefined;
    return row?.count ?? 0;
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
    // Validate entity type against allowlist (case-sensitive, must match client EntityType)
    if (!ALLOWED_ENTITY_TYPES.has(op.entityType)) {
      return {
        valid: false,
        error: `Invalid entityType: ${op.entityType}`,
        errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_TYPE,
      };
    }
    // Validate entityId format/length if present
    if (op.entityId !== undefined && op.entityId !== null) {
      if (typeof op.entityId !== 'string' || op.entityId.length > 255) {
        return {
          valid: false,
          error: 'Invalid entityId format or length',
          errorCode: SYNC_ERROR_CODES.INVALID_ENTITY_ID,
        };
      }
    }
    // DEL operations require entityId - a delete without a target is meaningless
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
    // Schema version validation
    if (op.schemaVersion !== undefined) {
      if (op.schemaVersion < 1 || op.schemaVersion > 100) {
        return {
          valid: false,
          error: `Invalid schema version: ${op.schemaVersion}`,
          errorCode: SYNC_ERROR_CODES.INVALID_SCHEMA_VERSION,
        };
      }
    }

    // Validate and sanitize vector clock
    const clockValidation = sanitizeVectorClock(op.vectorClock);
    if (!clockValidation.valid) {
      return {
        valid: false,
        error: clockValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_VECTOR_CLOCK,
      };
    }
    // Replace with sanitized clock (removes invalid entries)
    op.vectorClock = clockValidation.clock;

    // Check payload complexity BEFORE JSON.stringify to prevent DoS
    // Deep nesting can cause exponential CPU usage during serialization
    if (!this.validatePayloadComplexity(op.payload)) {
      return {
        valid: false,
        error: 'Payload too complex (max depth 20, max keys 10000)',
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    // Size limit
    const payloadSize = JSON.stringify(op.payload).length;
    if (payloadSize > this.config.maxPayloadSizeBytes) {
      return {
        valid: false,
        error: 'Payload too large',
        errorCode: SYNC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      };
    }

    // Validate payload structure based on operation type
    const payloadValidation = validatePayload(op.opType, op.payload);
    if (!payloadValidation.valid) {
      return {
        valid: false,
        error: payloadValidation.error,
        errorCode: SYNC_ERROR_CODES.INVALID_PAYLOAD,
      };
    }

    // Timestamp validation (based on HLC best practices)
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

  /**
   * Validate payload complexity to prevent DoS attacks via deeply nested objects.
   * Checks maximum nesting depth and total number of keys.
   *
   * @param payload - The payload to validate
   * @param maxDepth - Maximum allowed nesting depth (default 20)
   * @param maxKeys - Maximum total keys across all levels (default 10000)
   * @returns true if payload is within limits, false otherwise
   */
  private validatePayloadComplexity(
    payload: unknown,
    maxDepth: number = 20,
    maxKeys: number = 10000,
  ): boolean {
    let totalKeys = 0;

    const checkDepth = (obj: unknown, depth: number): boolean => {
      // Exceeded max depth
      if (depth > maxDepth) {
        return false;
      }

      // Primitives are fine
      if (obj === null || typeof obj !== 'object') {
        return true;
      }

      // Check arrays
      if (Array.isArray(obj)) {
        totalKeys += obj.length;
        if (totalKeys > maxKeys) {
          return false;
        }
        return obj.every((item) => checkDepth(item, depth + 1));
      }

      // Check objects
      const keys = Object.keys(obj);
      totalKeys += keys.length;
      if (totalKeys > maxKeys) {
        return false;
      }

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
