import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Operation, OperationLogEntry, VectorClock } from '../operation.types';
import { toEntityKey } from '../entity-key.util';

const DB_NAME = 'SUP_OPS';
const DB_VERSION = 1;

interface OpLogDB extends DBSchema {
  ops: {
    key: number; // seq
    value: OperationLogEntry;
    indexes: {
      byId: string;
      bySyncedAt: number;
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
    };
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

  async init(): Promise<void> {
    this._db = await openDB<OpLogDB>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        const opStore = db.createObjectStore('ops', {
          keyPath: 'seq',
          autoIncrement: true,
        });
        opStore.createIndex('byId', 'op.id', { unique: true });
        opStore.createIndex('bySyncedAt', 'syncedAt');

        db.createObjectStore('state_cache', { keyPath: 'id' });
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
    const entry: Omit<OperationLogEntry, 'seq'> = {
      op,
      appliedAt: Date.now(),
      source,
      syncedAt: source === 'remote' ? Date.now() : undefined,
      // For remote ops, track application status for crash recovery
      applicationStatus:
        source === 'remote' ? (options?.pendingApply ? 'pending' : 'applied') : undefined,
    };
    // seq is auto-incremented, returned for later reference
    return this.db.add('ops', entry as OperationLogEntry);
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
      const entry: Omit<OperationLogEntry, 'seq'> = {
        op,
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
      const seq = await store.add(entry as OperationLogEntry);
      seqs.push(seq as number);
    }

    await tx.done;
    return seqs;
  }

  /**
   * Marks operations as successfully applied.
   * Called after remote operations have been dispatched to NgRx.
   */
  async markApplied(seqs: number[]): Promise<void> {
    await this._ensureInit();
    const tx = this.db.transaction('ops', 'readwrite');
    const store = tx.objectStore('ops');
    for (const seq of seqs) {
      const entry = await store.get(seq);
      if (entry && entry.applicationStatus === 'pending') {
        entry.applicationStatus = 'applied';
        await store.put(entry);
      }
    }
    await tx.done;
  }

  /**
   * Gets remote operations that are pending application (for crash recovery).
   * These are ops that were stored but the app crashed before marking them applied.
   */
  async getPendingRemoteOps(): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    const all = await this.db.getAll('ops');
    return all.filter((e) => e.source === 'remote' && e.applicationStatus === 'pending');
  }

  async hasOp(id: string): Promise<boolean> {
    await this._ensureInit();
    const entry = await this.db.getFromIndex('ops', 'byId', id);
    return !!entry;
  }

  async getOpsAfterSeq(seq: number): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    return this.db.getAll('ops', IDBKeyRange.lowerBound(seq, true));
  }

  async getUnsynced(): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    // Scan all ops and filter. Optimized later if needed.
    const all = await this.db.getAll('ops');
    return all.filter((e) => !e.syncedAt && !e.rejectedAt);
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
    // Performance note: This could be slow for large logs, but compaction keeps it bounded.
    // getAllKeysFromIndex returns PRIMARY keys, not index values.
    // We need to get all entries and extract op.id.
    const entries = await this.db.getAll('ops');
    return new Set(entries.map((e) => e.op.id));
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
    while (cursor) {
      if (predicate(cursor.value)) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async getLastSeq(): Promise<number> {
    await this._ensureInit();
    const cursor = await this.db.transaction('ops').store.openCursor(null, 'prev');
    return cursor ? (cursor.key as number) : 0;
  }

  async saveStateCache(snapshot: {
    state: unknown;
    lastAppliedOpSeq: number;
    vectorClock: VectorClock;
    compactedAt: number;
    schemaVersion?: number;
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
  } | null> {
    await this._ensureInit();
    const cache = await this.db.get('state_cache', 'current');
    return cache || null;
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
      // No state cache yet - counter starts at 1
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
    const tx = this.db.transaction(['ops', 'state_cache'], 'readwrite');
    await tx.objectStore('ops').clear();
    await tx.objectStore('state_cache').clear();
    await tx.done;
  }
}
