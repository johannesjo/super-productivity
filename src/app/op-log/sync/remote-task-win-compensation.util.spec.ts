import {
  buildRestoreDependencyPlan,
  buildRestoreSubTaskCompensationSnapshots,
  normalizeRestoredTaskCompensationState,
  resolveRemoteTaskWinCompensationState,
  selectRestoreSubTaskCompensationState,
  type RestoreSubTaskCompensationSnapshots,
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
        tagIds: ['tag'],
        repeatCfgId: 'repeat',
        subTaskIds: ['declared-child', 'missing-remote-child'],
      },
      subTasks: [
        { id: 'declared-child', parentId: 'root', title: 'Remote declared' },
        {
          id: 'reverse-child',
          parentId: 'root',
          title: 'Remote reverse-linked',
          tagIds: ['child-tag'],
        },
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
        ['missing-remote-child']: {
          id: 'missing-remote-child',
          parentId: 'root',
          title: 'Local child without archive snapshot',
          tagIds: ['losing-child-tag'],
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
  const findRestoreDependencyCreateOps = (
    restoreContexts: readonly {
      remoteOp: Operation;
      restoreSubTaskSnapshots?: RestoreSubTaskCompensationSnapshots;
    }[],
    candidates: readonly Operation[],
    resolvePayloadKey: (entityType: EntityType) => string,
    batchOps: readonly Operation[],
  ): Array<Operation & { entityId: string }> =>
    buildRestoreDependencyPlan(
      restoreContexts.map(({ remoteOp }) => ({
        winner: 'remote',
        conflict: { ...conflict, remoteOps: [remoteOp] },
      })),
      candidates,
      resolvePayloadKey,
      batchOps,
    ).createOps;

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
    ).toEqual(['declared-child', 'missing-remote-child', 'reverse-child']);
  });

  it('selects only authenticated same-batch creates referenced by the restore', () => {
    const snapshots = buildRestoreSubTaskCompensationSnapshots(conflict, remoteRestore);
    const createOp = (
      id: string,
      entityType: EntityType,
      payloadKey: string,
      payloadId: string = id,
    ): Operation => ({
      ...operation(
        id,
        {
          PROJECT: ActionType.PROJECT_ADD,
          TAG: ActionType.TAG_ADD,
          TASK_REPEAT_CFG: ActionType.REPEAT_CFG_ADD,
        }[entityType] ?? ActionType.PROJECT_ADD,
        {
          actionPayload: { [payloadKey]: { id: payloadId } },
          entityChanges: [],
        },
      ),
      opType: OpType.Create,
      entityType,
      entityId: id,
    });
    const projectCreate = createOp('project', 'PROJECT', 'project');
    const tagCreate = createOp('tag', 'TAG', 'tag');
    const repeatCreate = createOp('repeat', 'TASK_REPEAT_CFG', 'taskRepeatCfg');
    const childTagCreate = createOp('child-tag', 'TAG', 'tag');
    const losingChildTagCreate = createOp('losing-child-tag', 'TAG', 'tag');
    const mismatchedCreate = createOp('tag', 'TAG', 'tag', 'other-tag');
    const unrelatedCreate = createOp('unrelated', 'PROJECT', 'project');

    expect(
      findRestoreDependencyCreateOps(
        [{ remoteOp: remoteRestore, restoreSubTaskSnapshots: snapshots }],
        [
          unrelatedCreate,
          projectCreate,
          mismatchedCreate,
          tagCreate,
          repeatCreate,
          childTagCreate,
          losingChildTagCreate,
        ],
        (entityType) =>
          ({
            PROJECT: 'project',
            TAG: 'tag',
            TASK_REPEAT_CFG: 'taskRepeatCfg',
          })[entityType] ?? entityType.toLowerCase(),
        [
          unrelatedCreate,
          projectCreate,
          mismatchedCreate,
          tagCreate,
          repeatCreate,
          childTagCreate,
          losingChildTagCreate,
          remoteRestore,
        ],
      ).map(({ id }) => id),
    ).toEqual(['project', 'tag', 'repeat', 'child-tag', 'losing-child-tag']);

    const wrongActionCreate = {
      ...tagCreate,
      actionType: ActionType.PROJECT_ADD,
    };
    expect(
      findRestoreDependencyCreateOps(
        [{ remoteOp: remoteRestore, restoreSubTaskSnapshots: snapshots }],
        [wrongActionCreate],
        () => 'tag',
        [wrongActionCreate, remoteRestore],
      ),
    ).toEqual([]);

    const tagUpdate: Operation = {
      ...operation('tag-update', ActionType.TAG_UPDATE, {
        actionPayload: { tag: { id: 'tag', title: 'Updated' } },
        entityChanges: [],
      }),
      entityType: 'TAG',
      entityId: 'tag',
    };
    expect(
      findRestoreDependencyCreateOps(
        [{ remoteOp: remoteRestore, restoreSubTaskSnapshots: snapshots }],
        [tagCreate],
        () => 'tag',
        [tagCreate, tagUpdate, remoteRestore],
      ).map(({ id }) => id),
    ).toEqual([tagCreate.id]);
    const updatedDependencyPlan = buildRestoreDependencyPlan(
      [{ winner: 'remote', conflict }],
      [tagCreate, tagUpdate],
      () => 'tag',
      [tagCreate, tagUpdate, remoteRestore],
    );
    expect(updatedDependencyPlan.createOps.map(({ id }) => id)).toEqual([tagCreate.id]);
    expect(
      updatedDependencyPlan.candidateCreateOpsByRestoreOpId
        .get(remoteRestore.id)
        ?.map(({ id }) => id),
    ).toEqual([tagCreate.id]);
    expect(updatedDependencyPlan.unsafeRestoreOpIds.size).toBe(0);

    const tagDelete: Operation = {
      ...operation('tag-delete', ActionType.TAG_DELETE, {
        actionPayload: { tag: { id: 'tag' } },
        entityChanges: [],
      }),
      opType: OpType.Delete,
      entityType: 'TAG',
      entityId: 'tag',
    };
    const deletedDependencyPlan = buildRestoreDependencyPlan(
      [{ winner: 'remote', conflict }],
      [tagCreate, tagDelete],
      () => 'tag',
      [tagCreate, tagDelete, remoteRestore],
    );
    expect(deletedDependencyPlan.createOps).toEqual([]);
    expect(
      deletedDependencyPlan.candidateCreateOpsByRestoreOpId
        .get(remoteRestore.id)
        ?.map(({ id }) => id),
    ).toEqual([tagCreate.id]);
    expect(deletedDependencyPlan.unsafeRestoreOpIds).toContain(remoteRestore.id);

    const taskAdd: Operation = {
      ...operation('task-add', ActionType.TASK_SHARED_ADD, {
        actionPayload: {
          task: { id: 'other-task', projectId: 'project' },
        },
        entityChanges: [],
      }),
      opType: OpType.Create,
      entityId: 'other-task',
    };
    expect(
      findRestoreDependencyCreateOps(
        [{ remoteOp: remoteRestore, restoreSubTaskSnapshots: snapshots }],
        [projectCreate],
        () => 'project',
        [projectCreate, taskAdd, remoteRestore],
      ).map(({ id }) => id),
    ).toEqual(['project']);

    const laterRestore = { ...remoteRestore, id: 'later-restore' };
    expect(
      findRestoreDependencyCreateOps(
        [{ remoteOp: remoteRestore, restoreSubTaskSnapshots: snapshots }],
        [projectCreate],
        () => 'project',
        [remoteRestore, projectCreate],
      ),
    ).toEqual([]);

    const dependencyPlan = buildRestoreDependencyPlan(
      [
        { winner: 'remote', conflict },
        {
          winner: 'remote',
          conflict: { ...conflict, remoteOps: [laterRestore] },
        },
      ],
      [projectCreate],
      () => 'project',
      [projectCreate, remoteRestore, laterRestore],
    );
    expect(dependencyPlan.createOps.map(({ id }) => id)).toEqual([projectCreate.id]);
    expect(dependencyPlan.primaryRestoreOpIds).toEqual(new Set([remoteRestore.id]));
    expect(dependencyPlan.unsafeRestoreOpIds.size).toBe(0);
    expect(
      [...dependencyPlan.candidateCreateOpsByRestoreOpId].map(
        ([restoreOpId, createOps]) => [restoreOpId, createOps.map(({ id }) => id)],
      ),
    ).toEqual([[remoteRestore.id, [projectCreate.id]]]);
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
