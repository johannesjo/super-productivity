import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Operation, OperationLogEntry, VectorClock, EntityType } from './operation.types';

const DB_NAME = 'SUP_OPS';
const DB_VERSION = 1;

interface OpLogDB extends DBSchema {
  ops: {
    key: number; // seq
    value: OperationLogEntry;
    indexes: {
      byId: string;
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

  async init(): Promise<void> {
    this._db = await openDB<OpLogDB>(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        const opStore = db.createObjectStore('ops', {
          keyPath: 'seq',
          autoIncrement: true,
        });
        opStore.createIndex('byId', 'op.id', { unique: true });

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
      await this.init();
    }
  }

  async append(op: Operation, source: 'local' | 'remote' = 'local'): Promise<void> {
    await this._ensureInit();
    const entry: Omit<OperationLogEntry, 'seq'> = {
      op,
      appliedAt: Date.now(),
      source,
      syncedAt: source === 'remote' ? Date.now() : undefined,
    };
    // seq is auto-incremented
    await this.db.add('ops', entry as OperationLogEntry);
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

  async getOpsAfterSeqDirect(seq: number): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    return this.db.getAll('ops', IDBKeyRange.lowerBound(seq, true));
  }

  async getUnsynced(): Promise<OperationLogEntry[]> {
    await this._ensureInit();
    // Scan all ops and filter. Optimized later if needed.
    const all = await this.db.getAll('ops');
    return all.filter((e) => !e.syncedAt);
  }

  async getUnsyncedByEntity(): Promise<Map<string, Operation[]>> {
    await this._ensureInit();
    const unsynced = await this.getUnsynced();
    const map = new Map<string, Operation[]>();
    for (const entry of unsynced) {
      const ids = entry.op.entityIds || (entry.op.entityId ? [entry.op.entityId] : []);
      for (const id of ids) {
        const key = `${entry.op.entityType}:${id}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry.op);
      }
    }
    return map;
  }

  async getAppliedOpIds(): Promise<Set<string>> {
    await this._ensureInit();
    // Performance note: This could be slow for large logs, but compaction keeps it bounded.
    // Index 'byId' contains op.id (string) values, so all keys are strings.
    // The cast is safe because our index is on string IDs.
    const opIds = (await this.db.getAllKeysFromIndex(
      'ops',
      'byId',
    )) as unknown as string[];
    return new Set(opIds);
  }

  /**
   * Marks an operation as applied. Currently a no-op because `append()`
   * already sets `appliedAt` to the current timestamp. This method exists
   * for interface completeness and future flexibility.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async markApplied(_id: string): Promise<void> {
    // No-op: appliedAt is set by append()
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

  async getCurrentVectorClock(): Promise<VectorClock> {
    await this._ensureInit();
    // We need the max vector clock from cache + subsequent ops.
    // Or just the latest op's vector clock?
    // Ops are ordered by sequence, but vector clocks might be merged?
    // But if we are linearizing ops, the last op's vector clock should be the current one (roughly).
    // Actually, we need to merge all clocks?
    // No, `vectorClock` in Op is "State of the world AFTER this Op".
    // So the last op's vector clock IS the current vector clock (if linear).
    // Or we take the cache's VC and merge with all ops since then?
    // Yes, because ops might come from different clients and be interleaved.
    // But wait, `vectorClock` in Op is the clock at that point.
    // So the latest Op (by seq) should have the accumulated clock?
    // If I create an op, I take current clock, increment my component.
    // So yes, the last op has the latest clock FOR ME.
    // But what about other components?
    // If I synced remote ops, they are appended.
    // Their VC might be different.
    // I need to merge the VCs of the "latest" ops from all clients?
    // Or simply: the `vectorClock` property on the very last op in the log is the current state?
    // Only if that op is causally after all previous ones.
    // Since we append sequentially, the last op "knows" about previous ones?
    // Not necessarily if we just appended a remote op that happened "concurrently" but we ordered it later.
    // But when we append a remote op, does its VC change? No.
    // So the last op in the log might have `{'A': 1, 'B': 1}`.
    // But previous op might have `{'A': 2, 'B': 0}` (if we appended out of causal order? No, we shouldn't).
    // We should rely on `EntityFrontier` or just merge everything.
    // Merging everything since snapshot is safest.

    const snapshot = await this.loadStateCache();
    let clock = snapshot ? { ...snapshot.vectorClock } : {};

    // Get ops after snapshot
    const seq = snapshot ? snapshot.lastAppliedOpSeq : 0;
    const ops = await this.getOpsAfterSeqDirect(seq);

    // Merge all op clocks?
    // Actually, we usually just want to know the max for each client.
    // Each op carries a VC.
    // We can just merge them all.
    const { mergeVectorClocks } = await import('../../../pfapi/api/util/vector-clock');
    for (const entry of ops) {
      clock = mergeVectorClocks(clock, entry.op.vectorClock);
    }
    return clock;
  }

  // Frontiers
  async getEntityFrontier(
    entityType?: EntityType,
    entityId?: string,
  ): Promise<Map<string, VectorClock>> {
    await this._ensureInit();
    // Return map of "entityType:entityId" -> VectorClock
    // Used for conflict detection.
    // We need the latest VC for each entity.
    // Iterate ops and update map?
    // Since we want "latest applied", we check all applied ops.
    // This could be expensive if not cached.
    // But we only look at ops since snapshot?
    // Yes, snapshot should contain the frontier?
    // The snapshot state doesn't have VCs per entity explicitly unless we store it.
    // The plan says `getEntityFrontier` returns `Map<string, VectorClock>`.
    // Maybe we calculate it from the log?

    const map = new Map<string, VectorClock>();

    // Load snapshot (not used for frontier? Or is it?)
    // If snapshot has state, does it have VCs?
    // The `state` is the NgRx state. It usually has `ids` and `entities`.
    // It doesn't store VCs per entity in the legacy state.
    // So we might only have VCs for ops in the log?
    // If an entity hasn't been touched since snapshot, what is its VC?
    // It's implicitly the snapshot's VC (or less).
    // But for conflict detection, if we receive an op with VC {A:1}, and snapshot VC is {A:5},
    // then the op is old.
    // If snapshot VC is {A:0}, op is new.
    // So using the Global VC (from snapshot + ops) is a conservative approximation?
    // No, per-entity conflict detection needs per-entity VC.
    // If we don't store per-entity VC in snapshot, we lose granularity after compaction.
    // The plan mentions `state_cache` has `vectorClock`. This is global.
    // Maybe we assume that for compacted ops, the frontier is the snapshot VC?
    // That would mean any op "older" than snapshot is discarded/merged?
    // Yes.

    // So we iterate ops in log.
    // For each entity, last op's VC is the frontier?
    // Yes.

    const snapshot = await this.loadStateCache();
    // Initial frontier is snapshot global VC?
    // Or empty?
    // If we use global VC as baseline for all entities, it's safe (over-estimates causality).

    const ops = await this.getOpsAfterSeqDirect(snapshot?.lastAppliedOpSeq || 0);
    for (const entry of ops) {
      const ids = entry.op.entityIds || (entry.op.entityId ? [entry.op.entityId] : []);

      for (const id of ids) {
        if (entityType && entry.op.entityType !== entityType) continue;
        if (entityId && id !== entityId) continue;

        const key = `${entry.op.entityType}:${id}`;
        map.set(key, entry.op.vectorClock);
      }
    }
    return map;
  }
}
