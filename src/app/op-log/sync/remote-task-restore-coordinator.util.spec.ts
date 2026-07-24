import {
  ActionType,
  type EntityConflict,
  type Operation,
  type OperationLogEntry,
  OpType,
} from '../core/operation.types';
import {
  IncompleteRemoteOperationsError,
  OperationIntegrityError,
} from '../core/errors/sync-errors';
import type { StoredOperationMetadata } from '../persistence/stored-operation-entry.util';
import {
  createRemoteTaskWinCompensations,
  prepareRemoteTaskRestoreBatch,
} from './remote-task-restore-coordinator.util';

describe('remote task restore coordinator', () => {
  const operation = (
    id: string,
    entityType: Operation['entityType'],
    entityId: string,
    actionType: ActionType,
    opType: OpType,
    actionPayload: Record<string, unknown>,
  ): Operation => ({
    id,
    actionType,
    opType,
    entityType,
    entityId,
    payload: { actionPayload, entityChanges: [] },
    clientId: 'remote',
    vectorClock: { remote: 1 },
    timestamp: 1,
    schemaVersion: 1,
  });

  const projectCreate = operation(
    'project-create',
    'PROJECT',
    'project',
    ActionType.PROJECT_ADD,
    OpType.Create,
    { project: { id: 'project' } },
  );
  const remoteRestore = operation(
    'task-restore',
    'TASK',
    'task',
    ActionType.TASK_SHARED_RESTORE,
    OpType.Update,
    {
      task: {
        id: 'task',
        projectId: 'project',
        subTaskIds: [],
      },
      subTasks: [],
    },
  );
  const conflict: EntityConflict = {
    entityType: 'TASK',
    entityId: 'task',
    localOps: [
      operation(
        'local-delete',
        'TASK',
        'task',
        ActionType.TASK_SHARED_DELETE,
        OpType.Delete,
        { task: { id: 'task' } },
      ),
    ],
    remoteOps: [remoteRestore],
    suggestedResolution: 'manual',
  };

  const storedEntry = (op: Operation, seq: number): OperationLogEntry => ({
    seq,
    op,
    appliedAt: 0,
    source: 'remote',
    applicationStatus: 'pending',
  });
  const inspectStoredOperations =
    (...entries: OperationLogEntry[]) =>
    async (
      operations: readonly Operation[],
    ): Promise<ReadonlyMap<string, StoredOperationMetadata>> => {
      const metadataById = new Map<string, StoredOperationMetadata>();
      for (const proposedOperation of operations) {
        const entry = entries.find(({ op }) => op.id === proposedOperation.id);
        if (!entry) {
          continue;
        }
        if (JSON.stringify(entry.op) !== JSON.stringify(proposedOperation)) {
          throw new OperationIntegrityError('stored operation mismatch');
        }
        metadataById.set(proposedOperation.id, entry);
      }
      return metadataById;
    };

  type PrepareOptions = Parameters<typeof prepareRemoteTaskRestoreBatch>[0];
  const prepare = (
    overrides: Partial<PrepareOptions> = {},
  ): ReturnType<typeof prepareRemoteTaskRestoreBatch> =>
    prepareRemoteTaskRestoreBatch({
      resolutions: [{ winner: 'remote', conflict }],
      conflicts: [conflict],
      nonConflictingOps: [projectCreate],
      remoteWinsOps: [remoteRestore],
      remoteOpsInOrder: [projectCreate, remoteRestore],
      resolvePayloadKey: () => 'project',
      inspectStoredOperations: inspectStoredOperations(),
      operationsEqual: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      ...overrides,
    });

  it('does not inspect storage when the batch has no task restore', async () => {
    const regularUpdate = operation(
      'regular-update',
      'TASK',
      'task',
      ActionType.TASK_SHARED_UPDATE,
      OpType.Update,
      { task: { id: 'task', changes: { title: 'Updated' } } },
    );
    const inspect = jasmine.createSpy('inspectStoredOperations');

    const result = await prepare({
      resolutions: [],
      conflicts: [],
      nonConflictingOps: [regularUpdate],
      remoteWinsOps: [],
      remoteOpsInOrder: [regularUpdate],
      inspectStoredOperations: inspect,
    });

    expect(inspect).not.toHaveBeenCalled();
    expect(result.remainingNonConflictingOps).toEqual([regularUpdate]);
  });

  it('rejects a missing dependency that would be appended after a stored restore', async () => {
    await expectAsync(
      prepare({
        inspectStoredOperations: inspectStoredOperations(storedEntry(remoteRestore, 1)),
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('accepts a stored prefix whose durable order matches the remote batch', async () => {
    const result = await prepare({
      inspectStoredOperations: inspectStoredOperations(
        storedEntry(projectCreate, 1),
        storedEntry(remoteRestore, 2),
      ),
    });

    expect(result.replayablePrefixOps).toEqual([projectCreate]);
  });

  it('rejects an inverted stored dependency prefix', async () => {
    const projectUpdate = operation(
      'project-update',
      'PROJECT',
      'project',
      ActionType.PROJECT_UPDATE,
      OpType.Update,
      { project: { id: 'project', changes: { title: 'Updated' } } },
    );

    await expectAsync(
      prepare({
        nonConflictingOps: [projectCreate, projectUpdate],
        remoteOpsInOrder: [projectCreate, projectUpdate, remoteRestore],
        inspectStoredOperations: inspectStoredOperations(
          storedEntry(projectCreate, 2),
          storedEntry(projectUpdate, 1),
        ),
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('rejects a dependency prefix containing an unrelated conflict', async () => {
    const unrelatedConflictOp = operation(
      'unrelated-conflict',
      'TASK',
      'other-task',
      ActionType.TASK_SHARED_UPDATE,
      OpType.Update,
      { task: { id: 'other-task', changes: { title: 'Updated' } } },
    );

    await expectAsync(
      prepare({
        remoteOpsInOrder: [projectCreate, unrelatedConflictOp, remoteRestore],
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('rejects a create-delete dependency lifecycle', async () => {
    const projectDelete = operation(
      'project-delete',
      'PROJECT',
      'project',
      ActionType.TASK_SHARED_DELETE_PROJECT,
      OpType.Delete,
      { project: { id: 'project' } },
    );

    await expectAsync(
      prepare({
        nonConflictingOps: [projectCreate, projectDelete],
        remoteOpsInOrder: [projectCreate, projectDelete, remoteRestore],
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('inspects a large restore prefix with one batched store call', async () => {
    const unrelatedPrefix = Array.from({ length: 100 }, (_, index) =>
      operation(
        `unrelated-${index}`,
        'TASK',
        `unrelated-task-${index}`,
        ActionType.TASK_SHARED_UPDATE,
        OpType.Update,
        {
          task: {
            id: `unrelated-task-${index}`,
            changes: { title: `Update ${index}` },
          },
        },
      ),
    );
    const inspect = jasmine
      .createSpy('inspectStoredOperations')
      .and.resolveTo(new Map<string, StoredOperationMetadata>());

    await prepare({
      nonConflictingOps: [...unrelatedPrefix, projectCreate],
      remoteOpsInOrder: [...unrelatedPrefix, projectCreate, remoteRestore],
      inspectStoredOperations: inspect,
    });

    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect.calls.mostRecent().args[0].length).toBe(102);
  });

  it('rejects fresh compensation after a later restore is already durable', async () => {
    const laterRestore = { ...remoteRestore, id: 'later-restore', timestamp: 2 };
    const multiRestoreConflict = {
      ...conflict,
      remoteOps: [remoteRestore, laterRestore],
    };
    const prepared = await prepare({
      resolutions: [{ winner: 'remote', conflict: multiRestoreConflict }],
      conflicts: [multiRestoreConflict],
      remoteWinsOps: [remoteRestore, laterRestore],
      remoteOpsInOrder: [projectCreate, remoteRestore, laterRestore],
      inspectStoredOperations: inspectStoredOperations(storedEntry(laterRestore, 3)),
    });

    await expectAsync(
      createRemoteTaskWinCompensations({
        preparedBatch: prepared,
        resolutions: [{ winner: 'remote', conflict: multiRestoreConflict }],
        getCurrentEntityState: async () => ({ id: 'task' }),
        createCompensation: async () => ({
          ...remoteRestore,
          id: 'compensation',
        }),
        createFollowUpOps: async () => [],
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('rejects fresh compensation after a later bulk operation targeting the task is durable', async () => {
    const laterUpdate = {
      ...operation(
        'later-update',
        'TASK',
        'other-task',
        ActionType.TASK_SHARED_UPDATE_MULTIPLE,
        OpType.Update,
        { taskIds: ['other-task', 'task'], changes: { isDone: true } },
      ),
      entityIds: ['other-task', 'task'],
    };
    const prepared = await prepare({
      nonConflictingOps: [projectCreate, laterUpdate],
      remoteOpsInOrder: [projectCreate, remoteRestore, laterUpdate],
      inspectStoredOperations: inspectStoredOperations(storedEntry(laterUpdate, 3)),
    });

    await expectAsync(
      createRemoteTaskWinCompensations({
        preparedBatch: prepared,
        resolutions: [{ winner: 'remote', conflict }],
        getCurrentEntityState: async () => ({ id: 'task' }),
        createCompensation: async () => ({
          ...remoteRestore,
          id: 'compensation',
        }),
        createFollowUpOps: async () => [],
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });

  it('allows independent restore roots when neither needs compensation', async () => {
    const firstRestore = {
      ...remoteRestore,
      payload: {
        actionPayload: {
          task: { id: 'task', projectId: '', subTaskIds: [] },
          subTasks: [],
        },
        entityChanges: [],
      },
    };
    const secondRestore = {
      ...firstRestore,
      id: 'second-restore',
      entityId: 'second-task',
      payload: {
        actionPayload: {
          task: { id: 'second-task', projectId: '', subTaskIds: [] },
          subTasks: [],
        },
        entityChanges: [],
      },
    };
    const secondConflict: EntityConflict = {
      ...conflict,
      entityId: 'second-task',
      localOps: [
        {
          ...conflict.localOps[0],
          id: 'second-local-delete',
          entityId: 'second-task',
        },
      ],
      remoteOps: [secondRestore],
    };

    const prepared = await prepare({
      resolutions: [
        {
          winner: 'remote',
          conflict: { ...conflict, remoteOps: [firstRestore] },
        },
        { winner: 'remote', conflict: secondConflict },
      ],
      conflicts: [{ ...conflict, remoteOps: [firstRestore] }, secondConflict],
      nonConflictingOps: [],
      remoteWinsOps: [firstRestore, secondRestore],
      remoteOpsInOrder: [firstRestore, secondRestore],
    });

    await expectAsync(
      createRemoteTaskWinCompensations({
        preparedBatch: prepared,
        resolutions: [
          {
            winner: 'remote',
            conflict: { ...conflict, remoteOps: [firstRestore] },
          },
          { winner: 'remote', conflict: secondConflict },
        ],
        getCurrentEntityState: async () => undefined,
        createCompensation: async () => undefined,
        createFollowUpOps: async () => [],
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        compensationOps: [],
      }),
    );

    await expectAsync(
      createRemoteTaskWinCompensations({
        preparedBatch: prepared,
        resolutions: [
          {
            winner: 'remote',
            conflict: { ...conflict, remoteOps: [firstRestore] },
          },
          { winner: 'remote', conflict: secondConflict },
        ],
        getCurrentEntityState: async () => ({ id: 'task' }),
        createCompensation: async () => ({
          ...firstRestore,
          id: 'compensation',
        }),
        createFollowUpOps: async () => [],
      }),
    ).toBeRejectedWithError(IncompleteRemoteOperationsError);
  });
});
