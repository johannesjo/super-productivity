import { OpLog } from '../../core/log';
import {
  EntityType,
  extractActionPayload,
  isLwwUpdatePayload,
  LwwUpdateMode,
  Operation,
  VectorClock,
} from '../core/operation.types';
import { IncompleteRemoteOperationsError } from '../core/errors/sync-errors';
import {
  normalizeRestoredTaskCompensationState,
  RestoreSubTaskCompensationSnapshots,
  selectRestoreSubTaskCompensationState,
} from './remote-task-win-compensation.util';

export interface TaskRecreationFollowUpOptions {
  entityExists?: (entityType: EntityType, entityId: string) => Promise<boolean>;
  ensureRegularProjectMembership?: boolean;
  restoreSubTaskSnapshots?: RestoreSubTaskCompensationSnapshots;
  requireComplete?: boolean;
}

interface TaskRecreationDependencies {
  createLwwUpdateOp: (
    entityType: EntityType,
    entityId: string,
    entityState: unknown,
    clientId: string,
    vectorClock: VectorClock,
    timestamp: number,
    lwwUpdateMode?: LwwUpdateMode,
  ) => Operation;
  getCurrentEntityState: (entityType: EntityType, entityId: string) => Promise<unknown>;
  getVectorClock: () => Promise<VectorClock | null | undefined>;
  loadClientId: () => Promise<string | null | undefined>;
  mergeAndIncrementClocks: (clocks: VectorClock[], clientId: string) => VectorClock;
}

export const markLwwDeleteRecreation = (op: Operation): Operation =>
  isLwwUpdatePayload(op.payload)
    ? {
        ...op,
        payload: {
          ...op.payload,
          recreatesEntityAfterDelete: true,
        },
      }
    : op;

export const taskRelationshipPatch = (
  taskId: string,
  taskState: Record<string, unknown>,
): Record<string, unknown> => ({
  id: taskId,
  projectId: taskState['projectId'],
  parentId: taskState['parentId'],
  subTaskIds: taskState['subTaskIds'],
});

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** Re-emits child and project relationships after a TASK recovery operation. */
export const createTaskRecreationFollowUpOperations = async (
  taskOp: Operation,
  options: TaskRecreationFollowUpOptions,
  dependencies: TaskRecreationDependencies,
): Promise<Operation[]> => {
  if (
    taskOp.entityType !== 'TASK' ||
    !taskOp.entityId ||
    !isLwwUpdatePayload(taskOp.payload) ||
    taskOp.payload.recreatesEntityAfterDelete !== true
  ) {
    return [];
  }
  const taskState = extractActionPayload(taskOp.payload);
  const projectId = taskState['projectId'];
  const parentId = taskState['parentId'];
  if (typeof projectId !== 'string') {
    return [];
  }

  const clientId = await dependencies.loadClientId();
  if (!clientId) {
    const error = new Error(
      'ConflictResolutionService: Cannot create TASK recovery follow-ups - no client ID',
    );
    if (options.requireComplete === true) {
      throw new IncompleteRemoteOperationsError(error);
    }
    OpLog.err(error.message);
    return [];
  }
  let nextClock = dependencies.mergeAndIncrementClocks(
    [(await dependencies.getVectorClock()) ?? {}, taskOp.vectorClock],
    clientId,
  );
  const followUpOps: Operation[] = [];
  const subTaskIds = taskState['subTaskIds'];
  if (Array.isArray(subTaskIds)) {
    const restoredSubTaskIds: string[] = [];
    for (const subTaskId of new Set(
      subTaskIds.filter((id): id is string => typeof id === 'string'),
    )) {
      const currentSubTaskRecord = asRecord(
        await dependencies.getCurrentEntityState('TASK' as EntityType, subTaskId),
      );
      const winningSubTaskState = options.restoreSubTaskSnapshots?.winning.get(subTaskId);
      const subTaskState = options.restoreSubTaskSnapshots
        ? selectRestoreSubTaskCompensationState(
            currentSubTaskRecord,
            winningSubTaskState,
            options.restoreSubTaskSnapshots.losing.get(subTaskId),
          )
        : currentSubTaskRecord;
      if (subTaskState === undefined) {
        if (
          options.restoreSubTaskSnapshots &&
          currentSubTaskRecord?.['parentId'] === taskOp.entityId &&
          currentSubTaskRecord['projectId'] === projectId
        ) {
          restoredSubTaskIds.push(subTaskId);
        }
        continue;
      }
      restoredSubTaskIds.push(subTaskId);
      const compensationSubTaskState =
        options.restoreSubTaskSnapshots?.clearSubTaskSchedule === true
          ? {
              ...subTaskState,
              dueDay: undefined,
              dueWithTime: undefined,
              remindAt: undefined,
            }
          : subTaskState;
      const normalizedSubTaskState = options.restoreSubTaskSnapshots
        ? await normalizeRestoredTaskCompensationState(
            compensationSubTaskState,
            options.entityExists ??
              (async (entityType, entityId) =>
                (await dependencies.getCurrentEntityState(entityType, entityId)) !==
                undefined),
          )
        : compensationSubTaskState;
      const subTaskOp = markLwwDeleteRecreation(
        dependencies.createLwwUpdateOp(
          'TASK' as EntityType,
          subTaskId,
          {
            ...normalizedSubTaskState,
            projectId,
            ...(options.restoreSubTaskSnapshots ? { parentId: taskOp.entityId } : {}),
          },
          clientId,
          nextClock,
          taskOp.timestamp,
        ),
      );
      followUpOps.push(subTaskOp);
      nextClock = dependencies.mergeAndIncrementClocks(
        [nextClock, subTaskOp.vectorClock],
        clientId,
      );
    }
    if (subTaskIds.length > 0) {
      const taskRelationshipOp = markLwwDeleteRecreation(
        dependencies.createLwwUpdateOp(
          'TASK' as EntityType,
          taskOp.entityId,
          taskRelationshipPatch(taskOp.entityId, {
            ...taskState,
            ...(options.restoreSubTaskSnapshots
              ? { subTaskIds: restoredSubTaskIds }
              : {}),
          }),
          clientId,
          nextClock,
          taskOp.timestamp,
          'patch',
        ),
      );
      followUpOps.push(taskRelationshipOp);
      nextClock = dependencies.mergeAndIncrementClocks(
        [nextClock, taskRelationshipOp.vectorClock],
        clientId,
      );
    }
  }

  if (typeof parentId === 'string') {
    const parentTaskState = await dependencies.getCurrentEntityState(
      'TASK' as EntityType,
      parentId,
    );
    if (parentTaskState === undefined) {
      return followUpOps;
    }
    followUpOps.push(
      markLwwDeleteRecreation(
        dependencies.createLwwUpdateOp(
          'TASK' as EntityType,
          parentId,
          taskRelationshipPatch(parentId, parentTaskState as Record<string, unknown>),
          clientId,
          dependencies.mergeAndIncrementClocks([nextClock], clientId),
          taskOp.timestamp,
          'patch',
        ),
      ),
    );
    return followUpOps;
  }

  const projectState = await dependencies.getCurrentEntityState(
    'PROJECT' as EntityType,
    projectId,
  );
  const project = asRecord(projectState);
  if (
    !project ||
    !Array.isArray(project['taskIds']) ||
    !Array.isArray(project['backlogTaskIds'])
  ) {
    return followUpOps;
  }
  const taskIds = [...project['taskIds']];
  let backlogTaskIds = [...project['backlogTaskIds']];
  if (options.ensureRegularProjectMembership === true) {
    if (!taskIds.includes(taskOp.entityId)) {
      taskIds.push(taskOp.entityId);
    }
    backlogTaskIds = backlogTaskIds.filter((id) => id !== taskOp.entityId);
  }
  followUpOps.push(
    markLwwDeleteRecreation(
      dependencies.createLwwUpdateOp(
        'PROJECT' as EntityType,
        projectId,
        {
          id: projectId,
          taskIds,
          backlogTaskIds,
        },
        clientId,
        dependencies.mergeAndIncrementClocks([nextClock], clientId),
        taskOp.timestamp,
        'patch',
      ),
    ),
  );
  return followUpOps;
};
