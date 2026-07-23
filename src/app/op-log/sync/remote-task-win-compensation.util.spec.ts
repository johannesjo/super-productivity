import {
  buildRestoreSubTaskCompensationSnapshots,
  normalizeRestoredTaskCompensationState,
  resolveRemoteTaskWinCompensationState,
  selectRestoreSubTaskCompensationState,
} from './remote-task-win-compensation.util';
import {
  ActionType,
  EntityConflict,
  EntityType,
  Operation,
  OpType,
} from '../core/operation.types';
import { INBOX_PROJECT } from '../../features/project/project.const';

describe('remote task win compensation', () => {
  const operation = (
    id: string,
    actionType: ActionType,
    payload: unknown,
  ): Operation => ({
    id,
    actionType,
    opType: OpType.Update,
    entityType: 'TASK',
    entityId: 'root',
    payload,
    clientId: 'client',
    vectorClock: { client: 1 },
    timestamp: 1,
    schemaVersion: 1,
  });

  const restorePayload = {
    actionPayload: {
      task: {
        id: 'root',
        projectId: 'project',
        subTaskIds: ['declared-child'],
      },
      subTasks: [
        { id: 'declared-child', parentId: 'root', title: 'Remote declared' },
        { id: 'reverse-child', parentId: 'root', title: 'Remote reverse-linked' },
        { id: 'other-child', parentId: 'other-root', title: 'Unrelated' },
      ],
      restoreToToday: {
        today: '2026-07-23',
        startOfNextDayDiffMs: 0,
      },
    },
    entityChanges: [],
  };
  const localUndo = operation('local-undo', ActionType.TASK_SHARED_RESTORE_DELETED, {
    actionPayload: {
      deletedTaskEntities: {
        root: { id: 'root', title: 'Local root' },
        ['declared-child']: {
          id: 'declared-child',
          parentId: 'root',
          title: 'Local child',
        },
      },
    },
    entityChanges: [],
  });
  const remoteRestore = operation(
    'remote-restore',
    ActionType.TASK_SHARED_RESTORE,
    restorePayload,
  );
  const conflict: EntityConflict = {
    entityType: 'TASK',
    entityId: 'root',
    localOps: [
      {
        ...localUndo,
        actionType: ActionType.TASK_SHARED_DELETE,
        opType: OpType.Delete,
      },
      localUndo,
    ],
    remoteOps: [remoteRestore],
    suggestedResolution: 'manual',
  };

  it('includes declared and valid reverse-linked remote children only', () => {
    const snapshots = buildRestoreSubTaskCompensationSnapshots(conflict, remoteRestore);

    expect([...snapshots!.winning.keys()]).toEqual(['declared-child', 'reverse-child']);
    expect(snapshots?.clearSubTaskSchedule).toBe(true);
    expect(snapshots!.losing.get('declared-child')?.['title']).toBe('Local child');
    expect(
      resolveRemoteTaskWinCompensationState(conflict, remoteRestore, {
        hasCurrentTask: true,
        resolvePayloadKey: () => 'task',
      })?.['subTaskIds'],
    ).toEqual(['declared-child', 'reverse-child']);
  });

  it('uses the remote child when current state only differs by undo modified time', () => {
    const losing = { id: 'child', title: 'Undo child', modified: 1 };
    const winning = { id: 'child', title: 'Remote child' };

    expect(
      selectRestoreSubTaskCompensationState({ ...losing, modified: 2 }, winning, losing),
    ).toBe(winning);
  });

  it('leaves an independently edited or deleted child alone', () => {
    const losing = { id: 'child', title: 'Undo child', modified: 1 };
    const winning = { id: 'child', title: 'Remote child' };

    expect(
      selectRestoreSubTaskCompensationState(
        { ...losing, title: 'Independent edit', modified: 2 },
        winning,
        losing,
      ),
    ).toBeUndefined();
    expect(
      selectRestoreSubTaskCompensationState(undefined, winning, losing),
    ).toBeUndefined();
    expect(selectRestoreSubTaskCompensationState(undefined, winning, undefined)).toBe(
      winning,
    );
  });

  it('preserves an unchanged undo child when its archive snapshot is missing', () => {
    const losing = { id: 'child', title: 'Undo child', modified: 1 };
    const current = { ...losing, modified: 2 };

    expect(selectRestoreSubTaskCompensationState(current, undefined, losing)).toBe(
      current,
    );
    expect(
      selectRestoreSubTaskCompensationState(
        { ...current, title: 'Independent edit' },
        undefined,
        losing,
      ),
    ).toBeUndefined();
    expect(
      selectRestoreSubTaskCompensationState(undefined, undefined, losing),
    ).toBeUndefined();
  });

  it('retains restore context when every archived child snapshot is missing', () => {
    const snapshots = buildRestoreSubTaskCompensationSnapshots(conflict, {
      ...remoteRestore,
      payload: {
        actionPayload: {
          task: {
            id: 'root',
            projectId: 'project',
            subTaskIds: ['declared-child'],
          },
          subTasks: [],
        },
        entityChanges: [],
      },
    });

    expect(snapshots?.winning.size).toBe(0);
    expect(snapshots?.losing.has('declared-child')).toBe(true);
  });

  it('normalizes stale restore references like the lifecycle reducer', async () => {
    const existing = new Set([
      `PROJECT:${INBOX_PROJECT.id}`,
      'TAG:valid-tag',
      'TASK_REPEAT_CFG:valid-repeat',
    ]);
    const entityExists = (entityType: EntityType, entityId: string): Promise<boolean> =>
      Promise.resolve(existing.has(`${entityType}:${entityId}`));

    await expectAsync(
      normalizeRestoredTaskCompensationState(
        {
          id: 'root',
          projectId: 'deleted-project',
          tagIds: ['TODAY', 'valid-tag', 'deleted-tag'],
          repeatCfgId: 'deleted-repeat',
        },
        entityExists,
      ),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        projectId: INBOX_PROJECT.id,
        tagIds: ['valid-tag'],
        repeatCfgId: undefined,
      }),
    );
    await expectAsync(
      normalizeRestoredTaskCompensationState(
        { id: 'root', projectId: '', tagIds: [] },
        entityExists,
      ),
    ).toBeResolvedTo(jasmine.objectContaining({ projectId: '' }));
  });
});
