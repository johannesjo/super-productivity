import { inject, Injectable } from '@angular/core';
import { Action, Store } from '@ngrx/store';
import { TaskLog } from '../../../core/log';
import { Operation } from '../../../op-log/core/operation.types';
import {
  ACTION_TYPE_ALIASES,
  convertOpToAction,
} from '../../../op-log/apply/operation-converter.util';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { RecentlyDeletedStoreService } from './recently-deleted-store.service';
import {
  getRecentlyDeletedEntriesFromAction,
  getRestoredTaskIdsFromAction,
  getRestoreTaskPayload,
  isRecentlyDeletedEntryExpired,
  RECENTLY_DELETED_RECORDED_ACTION_TYPES,
  RecentlyDeletedEntry,
} from './recently-deleted.util';

/**
 * Device-local trash for deleted tasks ("Recently deleted").
 *
 * Fed by the delete ops this client sees — local ones via
 * `RecentlyDeletedEffects`, remote ones via `OperationApplierService` — and
 * restored through the existing `restoreTask` action, so nothing new goes on
 * the sync wire. Best effort: a failure here is logged, never thrown, because
 * the remote path runs inside sync.
 * See docs/plans/2026-10-18-recently-deleted-tasks.md.
 */
@Injectable({
  providedIn: 'root',
})
export class RecentlyDeletedService {
  private readonly _store = inject(RecentlyDeletedStoreService);
  private readonly _ngrxStore = inject(Store);
  // Serializes writes so a delete and its restore are applied in order.
  private _queue: Promise<void> = Promise.resolve();

  recordAction(
    action: Action,
    deletedAt: number,
    now: number = Date.now(),
  ): Promise<void> {
    return this._enqueue(async () => {
      const entries = getRecentlyDeletedEntriesFromAction(action, deletedAt).filter(
        (entry) => !isRecentlyDeletedEntryExpired(entry, now),
      );
      await this._store.putMany(entries);
      await this._store.deleteMany(getRestoredTaskIdsFromAction(action));
    });
  }

  /** Records the trash-relevant ops among freshly applied remote ops. */
  recordRemoteOps(ops: readonly Operation[]): Promise<void> {
    const now = Date.now();
    const relevantOps = ops.filter((op) =>
      RECENTLY_DELETED_RECORDED_ACTION_TYPES.has(
        ACTION_TYPE_ALIASES[op.actionType] ?? op.actionType,
      ),
    );
    return Promise.all(
      relevantOps.map((op) => {
        let action: Action;
        try {
          action = convertOpToAction(op);
        } catch (e) {
          TaskLog.err('[RecentlyDeleted] Could not read remote op', { opId: op.id }, e);
          return Promise.resolve();
        }
        return this.recordAction(action, op.timestamp, now);
      }),
    ).then(() => undefined);
  }

  /** Non-expired entries, newest first. Drops expired ones as a side effect. */
  async getEntries(now: number = Date.now()): Promise<RecentlyDeletedEntry[]> {
    let entries: RecentlyDeletedEntry[] = [];
    await this._enqueue(async () => {
      const all = await this._store.getAll();
      const expiredIds = all
        .filter((entry) => isRecentlyDeletedEntryExpired(entry, now))
        .map((entry) => entry.id);
      await this._store.deleteMany(expiredIds);
      entries = all
        .filter((entry) => !isRecentlyDeletedEntryExpired(entry, now))
        .sort((a, b) => b.deletedAt - a.deletedAt);
    });
    return entries;
  }

  async restore(entry: RecentlyDeletedEntry): Promise<void> {
    // The local restoreTask is also seen by RecentlyDeletedEffects, which
    // removes the entry; awaiting the explicit delete keeps the dialog in step.
    this._ngrxStore.dispatch(TaskSharedActions.restoreTask(getRestoreTaskPayload(entry)));
    await this._enqueue(() => this._store.deleteMany([entry.id]));
  }

  async empty(): Promise<void> {
    await this._enqueue(() => this._store.clear());
  }

  private _enqueue(fn: () => Promise<void>): Promise<void> {
    const next = this._queue.then(fn).catch((e) => {
      TaskLog.err('[RecentlyDeleted] Trash storage failed', e);
    });
    this._queue = next;
    return next;
  }
}
