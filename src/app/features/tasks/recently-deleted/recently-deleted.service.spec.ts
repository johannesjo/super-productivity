import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { RecentlyDeletedService } from './recently-deleted.service';
import { RecentlyDeletedStoreService } from './recently-deleted-store.service';
import {
  RECENTLY_DELETED_RETENTION_MS,
  RecentlyDeletedEntry,
} from './recently-deleted.util';
import { createTask } from '../task.test-helper';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Operation, OpType } from '../../../op-log/core/operation.types';
import { ActionType } from '../../../op-log/core/action-types.enum';

class FakeRecentlyDeletedStore {
  entries = new Map<string, RecentlyDeletedEntry>();
  isFailing = false;

  async getAll(): Promise<RecentlyDeletedEntry[]> {
    this._maybeFail();
    return [...this.entries.values()];
  }

  async putMany(entries: RecentlyDeletedEntry[]): Promise<void> {
    this._maybeFail();
    entries.forEach((e) => this.entries.set(e.id, e));
  }

  async deleteMany(ids: string[]): Promise<void> {
    this._maybeFail();
    ids.forEach((id) => this.entries.delete(id));
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  private _maybeFail(): void {
    if (this.isFailing) throw new Error('idb down');
  }
}

const NOW = 1_700_000_000_000;

const deleteAction = (
  id: string,
  title = id,
): ReturnType<typeof TaskSharedActions.deleteTask> =>
  TaskSharedActions.deleteTask({ task: { ...createTask({ id, title }), subTasks: [] } });

const remoteOp = (
  actionType: ActionType,
  payload: Record<string, unknown>,
  timestamp: number,
): Operation =>
  ({
    id: `op-${Math.random()}`,
    actionType,
    opType: OpType.Delete,
    entityType: 'TASK',
    entityId: 'x',
    payload,
    clientId: 'other',
    vectorClock: { other: 1 },
    timestamp,
    schemaVersion: 1,
  }) as Operation;

describe('RecentlyDeletedService', () => {
  let service: RecentlyDeletedService;
  let store: FakeRecentlyDeletedStore;
  let dispatch: jasmine.Spy;

  beforeEach(() => {
    store = new FakeRecentlyDeletedStore();
    dispatch = jasmine.createSpy('dispatch');
    TestBed.configureTestingModule({
      providers: [
        RecentlyDeletedService,
        { provide: RecentlyDeletedStoreService, useValue: store },
        { provide: Store, useValue: { dispatch } },
      ],
    });
    service = TestBed.inject(RecentlyDeletedService);
  });

  it('records a delete and drops it again on a later restore', async () => {
    await service.recordAction(deleteAction('a'), NOW, NOW);
    expect([...store.entries.keys()]).toEqual(['a']);

    await service.recordAction(
      TaskSharedActions.restoreTask({ task: createTask({ id: 'a' }), subTasks: [] }),
      NOW,
      NOW,
    );
    expect(store.entries.size).toBe(0);
  });

  it('does not record a delete that is already past the retention', async () => {
    await service.recordAction(
      deleteAction('old'),
      NOW - RECENTLY_DELETED_RETENTION_MS - 1,
      NOW,
    );
    expect(store.entries.size).toBe(0);
  });

  it('returns entries newest first and purges expired ones', async () => {
    await service.recordAction(deleteAction('older'), NOW - 2000, NOW - 2000);
    await service.recordAction(deleteAction('newer'), NOW - 1000, NOW - 1000);
    await service.recordAction(deleteAction('newest'), NOW, NOW);

    const later = NOW + RECENTLY_DELETED_RETENTION_MS - 1500;
    const entries = await service.getEntries(later);

    expect(entries.map((e) => e.id)).toEqual(['newest', 'newer']);
    expect(store.entries.has('older')).toBeFalse();
  });

  it('restores through the existing restoreTask action and removes the entry', async () => {
    await service.recordAction(deleteAction('a', 'Task A'), NOW, NOW);
    const [entry] = await service.getEntries(NOW);

    await service.restore(entry);

    const action = dispatch.calls.mostRecent().args[0];
    expect(action.type).toBe(TaskSharedActions.restoreTask.type);
    expect(action.task.id).toBe('a');
    expect(action.restoreToToday).toBeUndefined();
    expect(store.entries.size).toBe(0);
  });

  it('empty() clears the trash without dispatching anything', async () => {
    await service.recordAction(deleteAction('a'), NOW, NOW);
    await service.empty();
    expect(store.entries.size).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('records remote deletes with the op timestamp and ignores unrelated ops', async () => {
    const ts = Date.now() - 1000;
    await service.recordRemoteOps([
      remoteOp(
        ActionType.TASK_SHARED_DELETE,
        { task: { ...createTask({ id: 'r', title: 'Remote' }), subTasks: [] } },
        ts,
      ),
      remoteOp(
        ActionType.TASK_SHARED_UPDATE,
        { task: { id: 'r', changes: { title: 'x' } } },
        ts,
      ),
    ]);

    expect([...store.entries.keys()]).toEqual(['r']);
    expect(store.entries.get('r')?.deletedAt).toBe(ts);
  });

  it('never rejects when storage fails, so the sync path stays unaffected', async () => {
    store.isFailing = true;
    await expectAsync(service.recordAction(deleteAction('a'), NOW, NOW)).toBeResolved();
    await expectAsync(
      service.recordRemoteOps([
        remoteOp(
          ActionType.TASK_SHARED_DELETE,
          { task: { ...createTask({ id: 'r', title: 'R' }), subTasks: [] } },
          Date.now(),
        ),
      ]),
    ).toBeResolved();
  });
});
