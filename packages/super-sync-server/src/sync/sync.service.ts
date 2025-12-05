import Database from 'better-sqlite3';
import * as zlib from 'zlib';
import { getDb, DbOperation } from '../db';
import {
  Operation,
  ServerOperation,
  UploadResult,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
} from './sync.types';
import { Logger } from '../logger';

/**
 * Valid entity types for operations.
 * Operations with unknown entity types will be rejected.
 */
const ALLOWED_ENTITY_TYPES = new Set([
  'task',
  'project',
  'tag',
  'note',
  'global_config',
  'simple_counter',
  'work_context',
  'task_repeat_cfg',
  'issue_provider',
  'planner',
  'menu_tree',
  'metric',
  'board',
  'reminder',
  'migration',
  'recovery',
  'all',
]);

/**
 * Maximum operations to process during snapshot generation.
 * Prevents memory exhaustion for users with excessive operation history.
 */
const MAX_OPS_FOR_SNAPSHOT = 100000;

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
  updateDeviceAck: Database.Statement;
  insertTombstone: Database.Statement;
  getTombstone: Database.Statement;
  deleteExpiredTombstones: Database.Statement;
  deleteOldSyncedOps: Database.Statement;
  getMinAckedSeq: Database.Statement;
  deleteStaleDevices: Database.Statement;
  getAllUserIds: Database.Statement;
  getOnlineDeviceCount: Database.Statement;
}

export class SyncService {
  private db: Database.Database;
  private stmts!: PreparedStatements;
  private config: SyncConfig;
  private rateLimitCounters: Map<number, { count: number; resetAt: number }> = new Map();

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
          client_timestamp, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        SELECT snapshot_data, last_snapshot_seq, snapshot_at
        FROM user_sync_state WHERE user_id = ?
      `),

      cacheSnapshot: this.db.prepare(`
        UPDATE user_sync_state
        SET snapshot_data = ?, last_snapshot_seq = ?, snapshot_at = ?
        WHERE user_id = ?
      `),

      getAllOps: this.db.prepare(`
        SELECT * FROM operations
        WHERE user_id = ?
        ORDER BY server_seq ASC
      `),

      updateDeviceAck: this.db.prepare(`
        UPDATE sync_devices
        SET last_acked_seq = ?, last_seen_at = ?
        WHERE user_id = ? AND client_id = ?
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

      deleteOldSyncedOps: this.db.prepare(`
        DELETE FROM operations
        WHERE user_id = ? AND server_seq < ? AND received_at < ?
      `),

      getMinAckedSeq: this.db.prepare(`
        SELECT MIN(last_acked_seq) as min_seq FROM sync_devices WHERE user_id = ?
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
    };
  }

  // === Upload Operations ===

  uploadOps(userId: number, clientId: string, ops: Operation[]): UploadResult[] {
    const results: UploadResult[] = [];
    const now = Date.now();

    // Ensure user has sync state row
    this.stmts.initUserSeq.run(userId);

    // Process in transaction for atomicity
    const tx = this.db.transaction(() => {
      for (const op of ops) {
        try {
          // Validate operation
          const validation = this.validateOp(op);
          if (!validation.valid) {
            results.push({
              opId: op.id,
              accepted: false,
              error: validation.error,
            });
            continue;
          }

          // Get next sequence number
          const row = this.stmts.getNextSeq.get(userId) as { last_seq: number };
          const serverSeq = row.last_seq;

          // Insert operation (normalize entityType to lowercase for consistency)
          this.stmts.insertOp.run(
            op.id,
            userId,
            clientId,
            serverSeq,
            op.actionType,
            op.opType,
            op.entityType.toLowerCase(),
            op.entityId ?? null,
            JSON.stringify(op.payload),
            JSON.stringify(op.vectorClock),
            op.schemaVersion,
            op.timestamp,
            now,
          );

          // Create tombstone for delete operations
          if (op.opType === 'DEL' && op.entityId) {
            this.createTombstoneSync(
              userId,
              op.entityType.toLowerCase(),
              op.entityId,
              op.id,
            );
          }

          results.push({
            opId: op.id,
            accepted: true,
            serverSeq,
          });
        } catch (err: unknown) {
          // Duplicate ID (already processed) - idempotency
          // Use SQLite error code for reliable detection instead of string matching
          const sqliteError = err as { code?: string };
          if (
            sqliteError?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
            sqliteError?.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
            sqliteError?.code === 'SQLITE_CONSTRAINT'
          ) {
            results.push({
              opId: op.id,
              accepted: false,
              error: 'Duplicate operation ID',
            });
          } else {
            throw err;
          }
        }
      }

      // Update device last seen
      this.stmts.updateDevice.run(clientId, userId, now, now);
    });

    tx();

    return results;
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

  getOpsSince(
    userId: number,
    sinceSeq: number,
    excludeClient?: string,
    limit: number = 500,
  ): ServerOperation[] {
    const stmt = excludeClient
      ? this.stmts.getOpsSinceExcludeClient
      : this.stmts.getOpsSince;

    const args = excludeClient
      ? [userId, sinceSeq, excludeClient, limit]
      : [userId, sinceSeq, limit];

    const rows = stmt.all(...args) as DbOperation[];

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
      },
      receivedAt: row.received_at,
    }));
  }

  getLatestSeq(userId: number): number {
    const row = this.stmts.getLatestSeq.get(userId) as { last_seq: number } | undefined;
    return row?.last_seq ?? 0;
  }

  // === Snapshot Management ===

  getCachedSnapshot(
    userId: number,
  ): { state: unknown; serverSeq: number; generatedAt: number } | null {
    const row = this.stmts.getCachedSnapshot.get(userId) as
      | {
          snapshot_data: Buffer | null;
          last_snapshot_seq: number | null;
          snapshot_at: number | null;
        }
      | undefined;

    if (!row?.snapshot_data) return null;

    // Decompress snapshot
    const decompressed = zlib.gunzipSync(row.snapshot_data).toString('utf-8');
    return {
      state: JSON.parse(decompressed),
      serverSeq: row.last_snapshot_seq ?? 0,
      generatedAt: row.snapshot_at ?? 0,
    };
  }

  cacheSnapshot(userId: number, state: unknown, serverSeq: number): void {
    const now = Date.now();
    // Compress snapshot to reduce storage
    const compressed = zlib.gzipSync(JSON.stringify(state));

    this.stmts.cacheSnapshot.run(compressed, serverSeq, now, userId);
  }

  generateSnapshot(userId: number): {
    state: unknown;
    serverSeq: number;
    generatedAt: number;
  } {
    const latestSeq = this.getLatestSeq(userId);
    let state: Record<string, unknown> = {};
    let startSeq = 0;

    // Try to get cached snapshot to build upon (Incremental Snapshot)
    const cached = this.getCachedSnapshot(userId);
    if (cached) {
      state = cached.state as Record<string, unknown>;
      startSeq = cached.serverSeq;
    }

    // If we are already up to date, return cached
    if (startSeq >= latestSeq && cached) {
      return {
        state: cached.state,
        serverSeq: cached.serverSeq,
        generatedAt: Date.now(), // Refresh timestamp
      };
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

      // Replay this batch
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

    return { state, serverSeq: latestSeq, generatedAt };
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
      const opType = row.op_type;
      const entityType = row.entity_type.toLowerCase();
      const entityId = row.entity_id;

      // Skip operations with invalid entity types (defensive)
      if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
        Logger.warn(`Skipping operation with invalid entity type: ${entityType}`);
        continue;
      }

      const payload = JSON.parse(row.payload);

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

  // === Device Acknowledgment ===

  updateDeviceAck(userId: number, clientId: string, lastAckedSeq: number): void {
    this.stmts.updateDeviceAck.run(lastAckedSeq, Date.now(), userId, clientId);
  }

  // === Rate Limiting ===

  isRateLimited(userId: number): boolean {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(userId);
    const limit = this.config.uploadRateLimit;

    if (!counter || now > counter.resetAt) {
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

  deleteOldSyncedOps(userId: number, beforeSeq: number, beforeTime: number): number {
    const result = this.stmts.deleteOldSyncedOps.run(userId, beforeSeq, beforeTime);
    return result.changes;
  }

  /**
   * Batch cleanup of old operations for all users in a single query.
   * Avoids N+1 query pattern by using a subquery to find minimum acked seq per user.
   * Only deletes operations that are:
   * 1. Older than cutoffTime
   * 2. Have been acknowledged by all devices for that user (seq < min acked seq)
   */
  deleteOldSyncedOpsForAllUsers(cutoffTime: number): number {
    // Use a single query with subquery to avoid N+1
    const stmt = this.db.prepare(`
      DELETE FROM operations
      WHERE received_at < ?
        AND server_seq < (
          SELECT COALESCE(MIN(last_acked_seq), 0)
          FROM sync_devices
          WHERE sync_devices.user_id = operations.user_id
        )
        AND EXISTS (
          SELECT 1 FROM sync_devices
          WHERE sync_devices.user_id = operations.user_id
        )
    `);
    const result = stmt.run(cutoffTime);
    return result.changes;
  }

  getMinAckedSeq(userId: number): number | null {
    const row = this.stmts.getMinAckedSeq.get(userId) as
      | { min_seq: number | null }
      | undefined;
    return row?.min_seq ?? null;
  }

  deleteStaleDevices(beforeTime: number): number {
    const result = this.stmts.deleteStaleDevices.run(beforeTime);
    return result.changes;
  }

  getAllUserIds(): number[] {
    const rows = this.stmts.getAllUserIds.all() as { user_id: number }[];
    return rows.map((r) => r.user_id);
  }

  // === Status ===

  getOnlineDeviceCount(userId: number): number {
    // Consider devices online if seen in last 5 minutes
    const fiveMinutesMs = 5 * 60 * 1000;
    const threshold = Date.now() - fiveMinutesMs;
    const row = this.stmts.getOnlineDeviceCount.get(userId, threshold) as
      | { count: number }
      | undefined;
    return row?.count ?? 0;
  }

  // === Validation ===

  private validateOp(op: Operation): { valid: boolean; error?: string } {
    if (!op.id || typeof op.id !== 'string') {
      return { valid: false, error: 'Invalid operation ID' };
    }
    if (op.id.length > 255) {
      return { valid: false, error: 'Operation ID too long' };
    }
    if (
      !op.opType ||
      ![
        'CRT',
        'UPD',
        'DEL',
        'MOV',
        'BATCH',
        'SYNC_IMPORT',
        'BACKUP_IMPORT',
        'REPAIR',
      ].includes(op.opType)
    ) {
      return { valid: false, error: 'Invalid opType' };
    }
    if (!op.entityType) {
      return { valid: false, error: 'Missing entityType' };
    }
    // Validate entity type against allowlist
    if (!ALLOWED_ENTITY_TYPES.has(op.entityType.toLowerCase())) {
      return { valid: false, error: `Invalid entityType: ${op.entityType}` };
    }
    // Validate entityId format/length if present
    if (op.entityId !== undefined && op.entityId !== null) {
      if (typeof op.entityId !== 'string' || op.entityId.length > 255) {
        return { valid: false, error: 'Invalid entityId format or length' };
      }
    }
    if (op.payload === undefined) {
      return { valid: false, error: 'Missing payload' };
    }
    // Schema version validation
    if (op.schemaVersion !== undefined) {
      if (op.schemaVersion < 1 || op.schemaVersion > 100) {
        return { valid: false, error: `Invalid schema version: ${op.schemaVersion}` };
      }
    }

    // Size limit
    const payloadSize = JSON.stringify(op.payload).length;
    if (payloadSize > this.config.maxPayloadSizeBytes) {
      return { valid: false, error: 'Payload too large' };
    }

    // Timestamp validation (based on HLC best practices)
    const now = Date.now();
    if (op.timestamp > now + this.config.maxClockDriftMs) {
      return { valid: false, error: 'Timestamp too far in future' };
    }
    if (op.timestamp < now - this.config.maxOpAgeMs) {
      return { valid: false, error: 'Operation too old' };
    }

    return { valid: true };
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
