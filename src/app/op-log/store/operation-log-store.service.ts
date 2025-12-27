import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import {
  Operation,
  OperationLogEntry,
  OpType,
  VectorClock,
} from '../core/operation.types';
import { toEntityKey } from '../util/entity-key.util';
import {
  encodeOperation,
  decodeOperation,
  isCompactOperation,
} from '../../core/persistence/operation-log/compact/operation-codec.service';
import { CompactOperation } from '../../core/persistence/operation-log/compact/compact-operation.types';

const DB_NAME = 'SUP_OPS';
const DB_VERSION = 3;

/**
 * Vector clock entry stored in the vector_clock object store.
 * Contains the clock and last update timestamp.
 */
interface VectorClockEntry {
  clock: VectorClock;
  lastUpdate: number;
}

/**
 * Stored operation log entry that can hold either compact or full operation format.
 * Used internally for backwards compatibility with existing data.
 */
interface StoredOperationLogEntry {
  seq: number;
  op: Operation | CompactOperation;
  appliedAt: number;
  source: 'local' | 'remote';
  syncedAt?: number;
  rejectedAt?: number;
  applicationStatus?: 'pending' | 'applied' | 'failed';
  retryCount?: number;
}

/**
 * Decodes a stored entry to a full OperationLogEntry.
 * Handles both compact and full operation formats for backwards compatibility.
 */
const decodeStoredEntry = (stored: StoredOperationLogEntry): OperationLogEntry => {
  const op = isCompactOperation(stored.op) ? decodeOperation(stored.op) : stored.op;
  return {
    seq: stored.seq,
    op,
    appliedAt: stored.appliedAt,
    source: stored.source,
    syncedAt: stored.syncedAt,
    rejectedAt: stored.rejectedAt,
    applicationStatus: stored.applicationStatus,
    retryCount: stored.retryCount,
  };
};

/**
 * Extracts the operation ID from either compact or full format.
 * Both formats use 'id' as the key for IndexedDB index compatibility.
 */
const getOpId = (op: Operation | CompactOperation): string => {
  return op.id;
};

interface OpLogDB extends DBSchema {
  ops: {
    key: number; // seq
    value: StoredOperationLogEntry;
    indexes: {
      byId: string;
      bySyncedAt: number;
      // PERF: Compound index for efficient queries on remote ops by status
      bySourceAndStatus: string;
    };
  };
  state_cache: {
    key: string;
    value: {
      id: string;
      state: unknown;
      lastAppliedOpSeq: number;
      vectorClock: VectorClock;
      compactedAt: number;
      schemaVersion?: number;
      compactionCounter?: number; // Tracks ops since last compaction (persistent)
      snapshotEntityKeys?: string[]; // Entity keys that existed at compaction time
    };
  };
  import_backup: {
    key: string;
    value: {
      id: string;
      state: unknown;
      savedAt: number;
    };
  };
  /**
   * Stores the current vector clock for local changes.
   * This is the single source of truth for the vector clock, updated atomically
   * with operation writes to avoid multiple database transactions per action.
   */
  vector_clock: {
    key: string; // 'current'
    value: VectorClockEntry;
  };
}

/**
 * Manages the persistence of operations and state snapshots in IndexedDB.
 * It uses a dedicated IndexedDB database ('SUP_OPS') to store:
 * - A chronological log of all application changes (`ops` object store).
 * - Periodic snapshots of the application state (`state_cache` object store) for faster hydration.
 * This service provides methods for appending operations, retrieving them, marking them as synced,
 * and managing the state cache for compaction and hydration.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationLogStoreService {
  private _db?: IDBPDatabase<OpLogDB>;
  private _initPromise?: Promise<void>;

  // Cache for getAppliedOpIds() to avoid full table scans on every download
  private _appliedOpIdsCache: Set<string> | null = null;
  private _cacheLastSeq: number = 0;

  // Cache for getUnsynced() to avoid full table scans on every sync
  private _unsyncedCache: OperationLogEntry[] | null = null;
  private _unsyncedCacheLastSeq: number = 0;

  // PERF: Cache for getVectorClock() to avoid IndexedDB read per operation
  private _vectorClockCache: VectorClock | null = null;

  async init(): Promise<void> {
    this._db = await openDB<OpLogDB>(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion, _newVersion, transaction) => {
        // Version 1: Create initial stores
        if (oldVersion < 1) {
          const opStore = db.createObjectStore('ops', {
            keyPath: 'seq',
            autoIncrement: true,
          });
          opStore.createIndex('byId', 'op.id', { unique: true });
          opStore.createIndex('bySyncedAt', 'syncedAt');

          db.createObjectStore('state_cache', { keyPath: 'id' });
          db.createObjectStore('import_backup', { keyPath: 'id' });
        }

        // Version 2: Add vector_clock store for atomic writes
        // This consolidates the vector clock from pf.META_MODEL into SUP_OPS
        // to enable single-transaction writes (op + vector clock together)
        if (oldVersion < 2) {
          db.createObjectStore('vector_clock');
        }

        // Version 3: Add compound index for efficient source+status queries
        // PERF: Enables O(results) queries for getPendingRemoteOps/getFailedRemoteOps
        // instead of O(all ops) full table scan
        if (oldVersion < 3) {
          const opStore = transaction.objectStore('ops');
          opStore.createIndex('bySourceAndStatus', ['source', 'applicationStatus']);
        }
      },
    });
  }

  private get db(): IDBPDatabase<OpLogDB> {
    if (!this._db) {
      // We can't make this async, so we throw if accessed before init.
      // However, to fix the issue of it not being initialized, we should call init() eagerly
      // or make methods async-ready (they are already async).
      // But we can't await in a getter.
      // Let's change the pattern: check in every method.
      throw new Error('OperationLogStore not initialized. Ensure init() is called.');
    }
    return this._db;
  }

  private async _ensureInit(): Promise<void> {
    if (!this._db) {
      if (!this._initPromise) {
        this._initPromise = this.init();
      }
      await this._initPromise;
    }
  }

  async append(
    op: Operation,
    source: 'local' | 'remote' = 'local',
    options?: { pendingApply?: boolean },
  ): Promise<number> {
    await this._ensureInit();
    // Encode operation to compact format for storage efficiency
    const compactOp = encodeOperation(op);
    const entry: Omit<StoredOperationLogEntry, 'seq'> = {
      op: compactOp,
      appliedAt: Date.now(),
      source,
      syncedAt: source === 'remote' ? Date.now() : undefined,
      // For remote ops, track application status for crash recovery
      applicationStatus:
        source === 'remote' ? (options?.pendingApply ? 'pending' : 'applied') : undefined,
    };
    // seq is auto-incremented, returned for later reference
    return this.db.add('ops', entry as StoredOperationLogEntry);
  }

  async appendBatch(
    ops: Operation[],
    source: 'local' | 'remote' = 'local',
    options?: { pendingApply?: boolean },
  ): Promise<number[]> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    const seqs: number[] = [];

    for (const op of ops) {
      // Encode operation to compact format for storage efficiency
      const compactOp = encodeOperation(op);
      const entry: Omit<StoredOperationLogEntry, 'seq'> = {
        op: compactOp,
        appliedAt: Date.now(),
        source,
        syncedAt: source === 'remote' ? Date.now() : undefined,
        applicationStatus:
          source === 'remote'
            ? options?.pendingApply
              ? 'pending'
              : 'applied'
            : undefined,
      };
      const seq = await store.add(entry as StoredOperationLogEntry);
      seqs.push(seq as number);
    }

    await tx.done;
    return seqs;
  }

  /**
   * Marks operations as successfully applied.
   * Called after remote operations have been dispatched to NgRx.
   * Also handles transitioning 'failed' ops to 'applied' when retrying succeeds.
   */
  async markApplied(seqs: number[]): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    for (const seq of seqs) {
      const entry = await store.get(seq);
      // Allow transitioning from 'pending' or 'failed' to 'applied'
      // 'failed' ops can be retried and need to be cleared when successful
      if (
        entry &&
        (entry.applicationStatus === 'pending' || entry.applicationStatus === 'failed')
      ) {
        entry.applicationStatus = 'applied';
        await store.put(entry);
      }
    }
    await tx.done;
  }

  /**
   * Gets remote operations that are pending application (for crash recovery).
   * These are ops that were stored but the app crashed before marking them applied.
   * PERF: Uses compound index for O(results) instead of O(all ops) scan.
   */
  async getPendingRemoteOps(): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    let storedEntries: StoredOperationLogEntry[];
    try {
      // Type assertion needed for compound index key - idb's types don't fully support this
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storedEntries = await this.db.getAllFromIndex('ops', 'bySourceAndStatus', [
        'remote',
        'pending',
      ] as any);
    } catch (e) {
      // Fallback for databases created before version 3 index migration
      // This handles the case where the bySourceAndStatus index doesn't exist
      console.warn(
        'OperationLogStoreService: bySourceAndStatus index not found, using fallback scan',
      );
      const allOps = await this.db.getAll('ops');
      storedEntries = allOps.filter(
        (entry) => entry.source === 'remote' && entry.applicationStatus === 'pending',
      );
    }
    // Decode compact operations for backwards compatibility
    return storedEntries.map(decodeStoredEntry);
  }

  async hasOp(id: string): Promise<boolean> {
    await this._ensureInit();
    const entry = await this.db.getFromIndex('ops', 'byId', id);
    return !!entry;
  }

  /**
   * Filters out operations that already exist in the store.
   * More efficient than calling hasOp() for each op individually.
   * @returns Only the operations that don't already exist in the store
   */
  async filterNewOps(ops: Operation[]): Promise<Operation[]> {
    if (ops.length === 0) return [];
    const appliedIds = await this.getAppliedOpIds();
    return ops.filter((op) => !appliedIds.has(op.id));
  }

  /**
   * Gets an operation entry by its ID.
   * Returns undefined if the operation doesn't exist.
   */
  async getOpById(id: string): Promise<OperationLogEntry | undefined> {
    await this._ensureInit();
    const stored = await this.db.getFromIndex('ops', 'byId', id);
    return stored ? decodeStoredEntry(stored) : undefined;
  }

  async getOpsAfterSeq(seq: number): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    const storedEntries = await this.db.getAll('ops', IDBKeyRange.lowerBound(seq, true));
    return storedEntries.map(decodeStoredEntry);
  }

  /**
   * Finds the latest full-state operation (SYNC_IMPORT, BACKUP_IMPORT, or REPAIR)
   * in the local operation log.
   *
   * This is used to filter incoming ops - any operation with a UUIDv7 timestamp
   * BEFORE the latest full-state op should be discarded, as it references state
   * that no longer exists.
   *
   * @returns The latest full-state operation, or undefined if none exists
   */
  async getLatestFullStateOp(): Promise<Operation | undefined> {
    await this._ensureInit();

    // Scan all ops to find full-state operations
    // Note: We scan backwards from the end since the latest is most likely near the end
    const storedOps = await this.db.getAll('ops');

    // Decode and filter to full-state ops
    const fullStateEntries = storedOps
      .map(decodeStoredEntry)
      .filter(
        (entry) =>
          entry.op.opType === OpType.SyncImport ||
          entry.op.opType === OpType.BackupImport ||
          entry.op.opType === OpType.Repair,
      );

    if (fullStateEntries.length === 0) {
      return undefined;
    }

    // Find the latest by UUIDv7 (lexicographic comparison works for UUIDv7)
    return fullStateEntries.reduce((latest, entry) =>
      entry.op.id > latest.op.id ? entry : latest,
    ).op;
  }

  async getUnsynced(): Promise<OperationLogEntry[]> {
    await this._ensureInit();

    const currentLastSeq = await this.getLastSeq();

    // Return cache if valid (no new operations since last cache build)
    if (this._unsyncedCache && this._unsyncedCacheLastSeq === currentLastSeq) {
      return [...this._unsyncedCache];
    }

    // If cache exists but is stale (new ops added), incrementally add new unsynced ops
    if (this._unsyncedCache && this._unsyncedCacheLastSeq > 0) {
      const newStoredEntries = await this.db.getAll(
        'ops',
        IDBKeyRange.lowerBound(this._unsyncedCacheLastSeq, true),
      );
      const newUnsynced = newStoredEntries
        .filter((e) => !e.syncedAt && !e.rejectedAt)
        .map(decodeStoredEntry);
      this._unsyncedCache.push(...newUnsynced);
      this._unsyncedCacheLastSeq = currentLastSeq;
      return [...this._unsyncedCache];
    }

    // Initial cache build - full scan required
    const all = await this.db.getAll('ops');
    this._unsyncedCache = all
      .filter((e) => !e.syncedAt && !e.rejectedAt)
      .map(decodeStoredEntry);
    this._unsyncedCacheLastSeq = currentLastSeq;

    return [...this._unsyncedCache];
  }

  /**
   * Invalidates the unsynced cache. Called when operations are marked synced/rejected.
   */
  private _invalidateUnsyncedCache(): void {
    this._unsyncedCache = null;
    this._unsyncedCacheLastSeq = 0;
  }

  async getUnsyncedByEntity(): Promise<Map<string, Operation[]>> {
    await this._ensureInit();
    const unsynced = await this.getUnsynced();
    const map = new Map<string, Operation[]>();
    for (const entry of unsynced) {
      const ids = entry.op.entityIds || (entry.op.entityId ? [entry.op.entityId] : []);
      for (const id of ids) {
        const key = toEntityKey(entry.op.entityType, id);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry.op);
      }
    }
    return map;
  }

  async getAppliedOpIds(): Promise<Set<string>> {
    await this._ensureInit();

    const currentLastSeq = await this.getLastSeq();

    // Return cache if valid (no new operations since last cache build)
    if (this._appliedOpIdsCache && this._cacheLastSeq === currentLastSeq) {
      return new Set(this._appliedOpIdsCache);
    }

    // If cache exists but is stale, incrementally add new IDs
    if (this._appliedOpIdsCache && this._cacheLastSeq > 0) {
      const newEntries = await this.db.getAll(
        'ops',
        IDBKeyRange.lowerBound(this._cacheLastSeq, true),
      );
      for (const entry of newEntries) {
        // Handle both compact and full operation formats
        this._appliedOpIdsCache.add(getOpId(entry.op));
      }
      this._cacheLastSeq = currentLastSeq;
      return new Set(this._appliedOpIdsCache);
    }

    // Initial cache build - full scan required
    const entries = await this.db.getAll('ops');
    // Handle both compact and full operation formats
    this._appliedOpIdsCache = new Set(entries.map((e) => getOpId(e.op)));
    this._cacheLastSeq = currentLastSeq;

    return new Set(this._appliedOpIdsCache);
  }

  async markSynced(seqs: number[]): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    const now = Date.now();
    for (const seq of seqs) {
      const entry = await store.get(seq);
      if (entry) {
        entry.syncedAt = now;
        await store.put(entry);
      }
    }
    await tx.done;
    this._invalidateUnsyncedCache();
  }

  async markRejected(opIds: string[]): Promise<void> {
    await this._ensureInit();

    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    const index = store.index('byId');
    const now = Date.now();

    for (const opId of opIds) {
      const entry = await index.get(opId);
      if (entry) {
        entry.rejectedAt = now;
        await store.put(entry);
      }
    }
    await tx.done;
    this._invalidateUnsyncedCache();
  }

  /**
   * Marks operations as failed (can be retried later).
   * Increments the retry count for each operation.
   * If maxRetries is provided and reached, marks as rejected instead.
   */
  async markFailed(opIds: string[], maxRetries?: number): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    const index = store.index('byId');
    const now = Date.now();

    for (const opId of opIds) {
      const entry = await index.get(opId);
      if (entry) {
        const newRetryCount = (entry.retryCount ?? 0) + 1;

        // If max retries reached, mark as rejected permanently
        if (maxRetries !== undefined && newRetryCount >= maxRetries) {
          entry.rejectedAt = now;
          entry.applicationStatus = undefined;
        } else {
          entry.applicationStatus = 'failed';
          entry.retryCount = newRetryCount;
        }
        await store.put(entry);
      }
    }
    await tx.done;
  }

  /**
   * Gets remote operations that failed and can be retried.
   * These are ops that were attempted but failed (e.g., missing dependency).
   * PERF: Uses compound index to reduce scan scope, then filters by rejectedAt.
   */
  async getFailedRemoteOps(): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    let storedEntries: StoredOperationLogEntry[];
    try {
      // Type assertion needed for compound index key - idb's types don't fully support this
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storedEntries = await this.db.getAllFromIndex('ops', 'bySourceAndStatus', [
        'remote',
        'failed',
      ] as any);
    } catch (e) {
      // Fallback for databases created before version 3 index migration
      console.warn(
        'OperationLogStoreService: bySourceAndStatus index not found, using fallback scan',
      );
      const allOps = await this.db.getAll('ops');
      storedEntries = allOps.filter(
        (entry) => entry.source === 'remote' && entry.applicationStatus === 'failed',
      );
    }
    // Decode and filter out rejected ops
    return storedEntries.filter((e) => !e.rejectedAt).map(decodeStoredEntry);
  }

  async deleteOpsWhere(predicate: (entry: OperationLogEntry) => boolean): Promise<void> {
    await this._ensureInit();
    // This requires iterating and deleting.
    // Ideally we delete by range (older than X).
    // The predicate in plan: syncedAt && appliedAt < old && seq <= lastSeq
    // We can iterate via cursor.
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    let cursor = await store.openCursor();
    let deletedCount = 0;
    while (cursor) {
      // Decode stored entry before applying predicate
      const decoded = decodeStoredEntry(cursor.value);
      if (predicate(decoded)) {
        await cursor.delete();
        deletedCount++;
      }
      cursor = await cursor.continue();
    }
    await tx.done;

    // Invalidate caches if any ops were deleted to prevent stale data
    if (deletedCount > 0) {
      this._appliedOpIdsCache = null;
      this._cacheLastSeq = 0;
      this._invalidateUnsyncedCache();
    }
  }

  async getLastSeq(): Promise<number> {
    await this._ensureInit();
    const cursor = await this.db.transaction('ops').store.openCursor(null, 'prev');
    return cursor ? (cursor.key as number) : 0;
  }

  /**
   * Checks if there are any operations that have been synced to the server.
   * Used to distinguish between:
   * - Fresh client (only local ops, never synced) → NOT a server migration
   * - Client that previously synced (has synced ops) → Server migration scenario
   */
  async hasSyncedOps(): Promise<boolean> {
    await this._ensureInit();
    // Use the bySyncedAt index to efficiently check for any synced ops
    const cursor = await this.db
      .transaction('ops')
      .store.index('bySyncedAt')
      .openCursor();
    return cursor !== null;
  }

  async saveStateCache(snapshot: {
    state: unknown;
    lastAppliedOpSeq: number;
    vectorClock: VectorClock;
    compactedAt: number;
    schemaVersion?: number;
    snapshotEntityKeys?: string[];
  }): Promise<void> {
    await this._ensureInit();
    await this.db.put('state_cache', {
      id: 'current',
      ...snapshot,
    });
  }

  async loadStateCache(): Promise<{
    state: unknown;
    lastAppliedOpSeq: number;
    vectorClock: VectorClock;
    compactedAt: number;
    schemaVersion?: number;
    snapshotEntityKeys?: string[];
  } | null> {
    await this._ensureInit();
    const cache = await this.db.get('state_cache', 'current');
    // Return null if cache doesn't exist or if state is null/undefined.
    // incrementCompactionCounter() may create a cache entry with state: null
    // just to track the counter - this shouldn't be treated as a valid snapshot.
    if (!cache || cache.state === null || cache.state === undefined) {
      return null;
    }
    return cache;
  }

  // ============================================================
  // Migration Safety Backup (A.7.12)
  // ============================================================

  /**
   * Saves a backup of the current state cache before running migrations.
   * If a migration crashes mid-process, this backup can be restored.
   */
  async saveStateCacheBackup(): Promise<void> {
    await this._ensureInit();
    const current = await this.db.get('state_cache', 'current');
    if (current) {
      await this.db.put('state_cache', {
        ...current,
        id: 'backup',
      });
    }
  }

  /**
   * Loads the backup state cache, if one exists.
   * Used for crash recovery during migration.
   */
  async loadStateCacheBackup(): Promise<{
    state: unknown;
    lastAppliedOpSeq: number;
    vectorClock: VectorClock;
    compactedAt: number;
    schemaVersion?: number;
    snapshotEntityKeys?: string[];
  } | null> {
    await this._ensureInit();
    const backup = await this.db.get('state_cache', 'backup');
    return backup || null;
  }

  /**
   * Clears the backup state cache after successful migration.
   */
  async clearStateCacheBackup(): Promise<void> {
    await this._ensureInit();
    await this.db.delete('state_cache', 'backup');
  }

  /**
   * Checks if a backup exists (indicates interrupted migration).
   */
  async hasStateCacheBackup(): Promise<boolean> {
    await this._ensureInit();
    const backup = await this.db.get('state_cache', 'backup');
    return !!backup;
  }

  /**
   * Restores the backup as the current state cache.
   * Used when migration fails and we need to rollback.
   */
  async restoreStateCacheFromBackup(): Promise<void> {
    await this._ensureInit();
    const backup = await this.db.get('state_cache', 'backup');
    if (backup) {
      await this.db.put('state_cache', {
        ...backup,
        id: 'current',
      });
      await this.db.delete('state_cache', 'backup');
    }
  }

  // ============================================================
  // Persistent Compaction Counter
  // ============================================================

  /**
   * Gets the current compaction counter value.
   * Returns 0 if no counter exists yet.
   */
  async getCompactionCounter(): Promise<number> {
    await this._ensureInit();
    const cache = await this.db.get('state_cache', 'current');
    return cache?.compactionCounter ?? 0;
  }

  /**
   * Atomically increments the compaction counter and returns the new value.
   * Uses a transaction to ensure the read-modify-write is atomic across tabs.
   * Used to track operations since last compaction across tabs/restarts.
   */
  async incrementCompactionCounter(): Promise<number> {
    await this._ensureInit();
    const tx = this.db.transaction('state_cache', 'readwrite');
    const store = tx.objectStore('state_cache');
    const cache = await store.get('current');

    if (!cache) {
      // No state cache yet - create one with counter starting at 1
      // Provide default values for required schema fields
      await store.put({
        id: 'current',
        state: null,
        lastAppliedOpSeq: 0,
        vectorClock: {},
        compactedAt: 0,
        compactionCounter: 1,
      });
      await tx.done;
      return 1;
    }

    const newCount = (cache.compactionCounter ?? 0) + 1;
    await store.put({
      ...cache,
      compactionCounter: newCount,
    });
    await tx.done;
    return newCount;
  }

  /**
   * Resets the compaction counter to 0.
   * Called after successful compaction.
   */
  async resetCompactionCounter(): Promise<void> {
    await this._ensureInit();
    const cache = await this.db.get('state_cache', 'current');
    if (cache) {
      await this.db.put('state_cache', {
        ...cache,
        compactionCounter: 0,
      });
    }
  }

  /**
   * Clears all data from the database. Used for testing purposes only.
   * @internal
   */
  async _clearAllDataForTesting(): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction(
      ['ops', 'state_cache', 'import_backup', 'vector_clock'],
      'readwrite',
    );
    await tx.objectStore('ops').clear();
    await tx.objectStore('state_cache').clear();
    await tx.objectStore('import_backup').clear();
    await tx.objectStore('vector_clock').clear();
    await tx.done;
    // Invalidate all caches
    this._appliedOpIdsCache = null;
    this._cacheLastSeq = 0;
    this._unsyncedCache = null;
    this._unsyncedCacheLastSeq = 0;
    this._vectorClockCache = null;
  }

  // ============================================================
  // Import Backup (pre-import state preservation)
  // ============================================================

  /**
   * Saves a backup of the current state before an import operation.
   * This allows manual recovery if the import causes issues.
   */
  async saveImportBackup(state: unknown): Promise<void> {
    await this._ensureInit();
    await this.db.put('import_backup', {
      id: 'current',
      state,
      savedAt: Date.now(),
    });
  }

  /**
   * Loads the import backup, if one exists.
   */
  async loadImportBackup(): Promise<{ state: unknown; savedAt: number } | null> {
    await this._ensureInit();
    const backup = await this.db.get('import_backup', 'current');
    return backup ? { state: backup.state, savedAt: backup.savedAt } : null;
  }

  /**
   * Clears the import backup.
   */
  async clearImportBackup(): Promise<void> {
    await this._ensureInit();
    await this.db.delete('import_backup', 'current');
  }

  /**
   * Checks if an import backup exists.
   */
  async hasImportBackup(): Promise<boolean> {
    await this._ensureInit();
    const backup = await this.db.get('import_backup', 'current');
    return !!backup;
  }

  /**
   * Clears all operations from the operation log.
   * Used when importing data to avoid accumulating old SYNC_IMPORT operations.
   * NOTE: This does NOT clear the state_cache - that should be updated separately.
   */
  async clearAllOperations(): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    await tx.objectStore('ops').clear();
    await tx.done;
    // Invalidate caches since we cleared all ops
    this._appliedOpIdsCache = null;
    this._cacheLastSeq = 0;
    this._invalidateUnsyncedCache();
  }

  // ============================================================
  // Vector Clock Management (Performance Optimization)
  // ============================================================

  /**
   * Gets the current vector clock from the SUP_OPS database.
   * Returns null if no vector clock has been stored yet.
   * PERF: Uses in-memory cache to avoid IndexedDB read on every operation.
   */
  async getVectorClock(): Promise<VectorClock | null> {
    if (this._vectorClockCache !== null) {
      return { ...this._vectorClockCache };
    }
    await this._ensureInit();
    const entry = await this.db.get('vector_clock', 'current');
    this._vectorClockCache = entry?.clock ?? null;
    return this._vectorClockCache ? { ...this._vectorClockCache } : null;
  }

  /**
   * Sets the vector clock directly. Used for:
   * - Migration from pf.META_MODEL on upgrade
   * - Sync import when receiving full state
   */
  async setVectorClock(clock: VectorClock): Promise<void> {
    await this._ensureInit();
    await this.db.put('vector_clock', { clock, lastUpdate: Date.now() }, 'current');
    this._vectorClockCache = clock;
  }

  /**
   * Merges remote operations' vector clocks into the local vector clock.
   *
   * CRITICAL: This must be called after applying remote operations to ensure
   * subsequent local operations have vector clocks that dominate the remote ops.
   *
   * Without this, the following bug occurs:
   * 1. Client A does SYNC_IMPORT with clock {A: 1}
   * 2. Client B downloads and applies the import
   * 3. Client B's vector clock is NOT updated (missing A's clock entry)
   * 4. Client B creates new ops with clock {B: 1} (missing A's entry)
   * 5. These ops are compared as CONCURRENT with the import, not GREATER_THAN
   * 6. SyncImportFilterService incorrectly filters them as "invalidated by import"
   *
   * @param ops Remote operations whose clocks should be merged into local clock
   */
  async mergeRemoteOpClocks(ops: Operation[]): Promise<void> {
    if (ops.length === 0) return;

    await this._ensureInit();

    // Get current local clock
    const currentClock = (await this.getVectorClock()) ?? {};

    // Merge all remote ops' clocks into the local clock
    const mergedClock = { ...currentClock };
    for (const op of ops) {
      for (const [clientId, counter] of Object.entries(op.vectorClock)) {
        mergedClock[clientId] = Math.max(mergedClock[clientId] ?? 0, counter);
      }
    }

    // Update the vector clock store
    await this.db.put(
      'vector_clock',
      { clock: mergedClock, lastUpdate: Date.now() },
      'current',
    );
    this._vectorClockCache = mergedClock;
  }

  /**
   * Gets the full vector clock entry including lastUpdate timestamp.
   * Used by legacy sync bridge to sync vector clock to pf.META_MODEL.
   */
  async getVectorClockEntry(): Promise<VectorClockEntry | null> {
    await this._ensureInit();
    const entry = await this.db.get('vector_clock', 'current');
    return entry ?? null;
  }

  /**
   * Appends an operation AND updates the vector clock in a SINGLE atomic transaction.
   *
   * PERFORMANCE: This is the key optimization for mobile devices. Previously, each action
   * required two separate IndexedDB transactions (one to SUP_OPS, one to pf.META_MODEL).
   * By consolidating the vector clock into SUP_OPS, we can write both in a single transaction,
   * reducing disk I/O by ~50%.
   *
   * NOTE: The operation's vectorClock field should already contain the incremented clock
   * (incremented by the caller). This method stores that clock as the current vector clock,
   * it does NOT increment again.
   *
   * @param op The operation to append (with vectorClock already set)
   * @param source Whether this is a local or remote operation
   * @param options Additional options (e.g., pendingApply for remote ops)
   * @returns The sequence number of the appended operation
   */
  async appendWithVectorClockUpdate(
    op: Operation,
    source: 'local' | 'remote' = 'local',
    options?: { pendingApply?: boolean },
  ): Promise<number> {
    await this._ensureInit();

    const tx = this.db.transaction(['ops', 'vector_clock'], 'readwrite');
    const opsStore = tx.objectStore('ops');
    const vcStore = tx.objectStore('vector_clock');

    // 1. Append operation to ops store (encoded to compact format)
    const compactOp = encodeOperation(op);
    const entry: Omit<StoredOperationLogEntry, 'seq'> = {
      op: compactOp,
      appliedAt: Date.now(),
      source,
      syncedAt: source === 'remote' ? Date.now() : undefined,
      applicationStatus:
        source === 'remote' ? (options?.pendingApply ? 'pending' : 'applied') : undefined,
    };
    const seq = await opsStore.add(entry as StoredOperationLogEntry);

    // 2. Update vector clock to match the operation's clock (only for local ops)
    // The op.vectorClock already contains the incremented value from the caller.
    // We store it as the current clock so subsequent operations can build on it.
    if (source === 'local') {
      await vcStore.put({ clock: op.vectorClock, lastUpdate: Date.now() }, 'current');
      this._vectorClockCache = op.vectorClock;
    }

    await tx.done;
    return seq as number;
  }
}
