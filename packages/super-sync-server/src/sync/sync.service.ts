import Database from 'better-sqlite3';
import * as zlib from 'zlib';
import { getDb, DbOperation } from '../db';
import { Logger } from '../logger';
import {
  Operation,
  ServerOperation,
  UploadResult,
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
} from './sync.types';

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
          );

          // Create tombstone for delete operations
          if (op.opType === 'DEL' && op.entityId) {
            this.createTombstoneSync(userId, op.entityType, op.entityId, op.id);
          }

          results.push({
            opId: op.id,
            accepted: true,
            serverSeq,
          });
        } catch (err: unknown) {
          // Duplicate ID (already processed) - idempotency
          if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
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
    // Get all operations for this user
    const allOps = this.stmts.getAllOps.all(userId) as DbOperation[];
    const latestSeq = this.getLatestSeq(userId);

    // Replay operations to build current state
    const state = this.replayOpsToState(allOps);
    const generatedAt = Date.now();

    // Cache for future requests
    this.cacheSnapshot(userId, state, latestSeq);

    return { state, serverSeq: latestSeq, generatedAt };
  }

  private replayOpsToState(ops: DbOperation[]): Record<string, unknown> {
    // Initialize empty state
    const state: Record<string, Record<string, unknown>> = {};

    // Apply operations in order
    for (const row of ops) {
      const opType = row.op_type;
      const entityType = row.entity_type.toLowerCase();
      const entityId = row.entity_id;
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
        case 'SYNC_IMPORT':
          // Full state import - replace everything
          Object.assign(state, payload);
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
    const threshold = Date.now() - 5 * 60 * 1000;
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
    if (
      !op.opType ||
      !['CRT', 'UPD', 'DEL', 'MOV', 'BATCH', 'SYNC_IMPORT'].includes(op.opType)
    ) {
      return { valid: false, error: 'Invalid opType' };
    }
    if (!op.entityType) {
      return { valid: false, error: 'Missing entityType' };
    }
    if (op.payload === undefined) {
      return { valid: false, error: 'Missing payload' };
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
