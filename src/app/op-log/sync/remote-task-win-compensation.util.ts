import { convertLocalDeleteRemoteUpdatesToLww, deepEqual } from '@sp/sync-core';
import {
  ActionType,
  EntityConflict,
  EntityType,
  extractActionPayload,
  isLwwUpdatePayload,
  Operation,
  OpType,
} from '../core/operation.types';
import { toLwwUpdateActionType } from '../core/lww-update-action-types';
import { isSingletonEntityId } from '../core/entity-registry';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { INBOX_PROJECT } from '../../features/project/project.const';

interface RemoteTaskWinCompensationOptions {
  hasCurrentTask: boolean;
  resolvePayloadKey: (entityType: EntityType) => string;
}

export interface RestoreSubTaskCompensationSnapshots {
  winning: ReadonlyMap<string, Record<string, unknown>>;
  losing: ReadonlyMap<string, Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const addTaskSnapshots = (
  target: Map<string, Record<string, unknown>>,
  candidates: readonly unknown[],
  isValid: (candidate: Record<string, unknown>) => boolean = () => true,
): void => {
  for (const candidate of candidates) {
    if (
      !isRecord(candidate) ||
      typeof candidate['id'] !== 'string' ||
      Object.prototype.hasOwnProperty.call(Object.prototype, candidate['id']) ||
      !isValid(candidate)
    ) {
      continue;
    }
    target.set(candidate['id'], candidate);
  }
};

export const buildRestoreSubTaskCompensationSnapshots = (
  conflict: EntityConflict,
  remoteOp: Operation,
): RestoreSubTaskCompensationSnapshots | undefined => {
  if (remoteOp.actionType !== ActionType.TASK_SHARED_RESTORE) {
    return undefined;
  }

  const winning = new Map<string, Record<string, unknown>>();
  const remotePayload = extractActionPayload(remoteOp.payload);
  const restoredTask = remotePayload['task'];
  if (!isRecord(restoredTask) || typeof restoredTask['id'] !== 'string') {
    return undefined;
  }
  const rootId = restoredTask['id'];
  const declaredSubTaskIds = new Set(
    Array.isArray(restoredTask['subTaskIds'])
      ? restoredTask['subTaskIds'].filter(
          (id): id is string =>
            typeof id === 'string' &&
            !Object.prototype.hasOwnProperty.call(Object.prototype, id),
        )
      : [],
  );
  const winningSubTasks = remotePayload['subTasks'];
  if (Array.isArray(winningSubTasks)) {
    addTaskSnapshots(winning, winningSubTasks, (candidate) => {
      const candidateId = candidate['id'];
      const parentId = candidate['parentId'];
      return (
        typeof candidateId === 'string' &&
        candidateId !== rootId &&
        (parentId === rootId || (!parentId && declaredSubTaskIds.has(candidateId)))
      );
    });
  }

  const losing = new Map<string, Record<string, unknown>>();
  for (const localOp of conflict.localOps) {
    if (localOp.actionType !== ActionType.TASK_SHARED_RESTORE_DELETED) {
      continue;
    }
    const localPayload = extractActionPayload(localOp.payload);
    const deletedTaskEntities = localPayload['deletedTaskEntities'];
    if (isRecord(deletedTaskEntities)) {
      addTaskSnapshots(losing, Object.values(deletedTaskEntities));
    }
  }

  return { winning, losing };
};

export const selectRestoreSubTaskCompensationState = (
  current: Record<string, unknown> | undefined,
  winning: Record<string, unknown> | undefined,
  losing: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!current) {
    // A child restored by the rejected undo and then removed again has an
    // independent later delete. Do not resurrect it from the remote snapshot.
    return losing ? undefined : winning;
  }
  if (!losing) return undefined;
  const comparableCurrent = { ...current };
  const comparableLosing = { ...losing };
  delete comparableCurrent['modified'];
  delete comparableLosing['modified'];
  if (!deepEqual(comparableCurrent, comparableLosing)) {
    // A child independently edited after the rejected undo keeps its own op.
    return undefined;
  }

  // Prefer the remote archive snapshot. If it is missing, preserve the exact
  // undo snapshot so a clean client does not drop a child that the root still
  // references.
  return winning ?? current;
};

export const normalizeRestoredTaskCompensationState = async (
  taskState: Record<string, unknown>,
  entityExists: (entityType: EntityType, entityId: string) => Promise<boolean>,
): Promise<Record<string, unknown>> => {
  const requestedProjectId = taskState['projectId'];
  let projectId = typeof requestedProjectId === 'string' ? requestedProjectId : '';
  if (projectId && !(await entityExists('PROJECT' as EntityType, projectId))) {
    projectId = (await entityExists('PROJECT' as EntityType, INBOX_PROJECT.id))
      ? INBOX_PROJECT.id
      : '';
  }

  const tagIds: string[] = [];
  if (Array.isArray(taskState['tagIds'])) {
    for (const tagId of taskState['tagIds']) {
      if (
        typeof tagId === 'string' &&
        tagId !== TODAY_TAG.id &&
        (await entityExists('TAG' as EntityType, tagId))
      ) {
        tagIds.push(tagId);
      }
    }
  }

  const repeatCfgId = taskState['repeatCfgId'];
  const normalizedRepeatCfgId =
    typeof repeatCfgId === 'string' &&
    (await entityExists('TASK_REPEAT_CFG' as EntityType, repeatCfgId))
      ? repeatCfgId
      : undefined;

  return {
    ...taskState,
    projectId,
    tagIds,
    repeatCfgId: normalizedRepeatCfgId,
  };
};

/**
 * Reconstructs the authoritative TASK snapshot for a semantic remote winner
 * whose original action may no-op after a losing local recreation.
 */
export const resolveRemoteTaskWinCompensationState = (
  conflict: EntityConflict,
  remoteOp: Operation,
  options: RemoteTaskWinCompensationOptions,
): Record<string, unknown> | undefined => {
  if (conflict.entityType !== 'TASK' || remoteOp.opType !== OpType.Update) {
    return undefined;
  }

  if (remoteOp.actionType === ActionType.TASK_SHARED_RESTORE) {
    if (
      !options.hasCurrentTask ||
      !conflict.localOps.some((op) => op.opType === OpType.Delete)
    ) {
      return undefined;
    }
    const restoredTask = extractActionPayload(remoteOp.payload)['task'];
    if (
      typeof restoredTask !== 'object' ||
      restoredTask === null ||
      Array.isArray(restoredTask)
    ) {
      return undefined;
    }
    const taskState = {
      ...(restoredTask as Record<string, unknown>),
      isDone: false,
      doneOn: undefined,
    };
    const restoredSubTasks = buildRestoreSubTaskCompensationSnapshots(conflict, remoteOp);
    const declaredSubTaskIds = Array.isArray(taskState['subTaskIds'])
      ? taskState['subTaskIds'].filter((id): id is string => typeof id === 'string')
      : [];
    taskState['subTaskIds'] = [
      ...new Set([...declaredSubTaskIds, ...(restoredSubTasks?.winning.keys() ?? [])]),
    ];
    delete taskState['subTasks'];
    return taskState;
  }

  const localRecreation = conflict.localOps.find(
    (op) =>
      isLwwUpdatePayload(op.payload) && op.payload.recreatesEntityAfterDelete === true,
  );
  if (!localRecreation) {
    return undefined;
  }

  const isMoveToProject = remoteOp.actionType === ActionType.TASK_SHARED_MOVE_TO_PROJECT;
  const isTaskLwwUpdate =
    remoteOp.actionType === toLwwUpdateActionType('TASK') &&
    isLwwUpdatePayload(remoteOp.payload);
  const isAdapterTaskUpdate = [
    ActionType.TASK_SHARED_UPDATE,
    ActionType.TASK_UPDATE_UI,
    ActionType.TASK_SHARED_UPDATE_MULTIPLE,
    ActionType.TASK_UPDATE_MULTIPLE_SIMPLE,
  ].includes(remoteOp.actionType);
  if (!isMoveToProject && !isTaskLwwUpdate && !isAdapterTaskUpdate) {
    return undefined;
  }

  const localTaskState = { ...extractActionPayload(localRecreation.payload) };
  delete localTaskState['subTasks'];
  const remoteActionPayload = extractActionPayload(remoteOp.payload);
  const targetProjectId = remoteActionPayload['targetProjectId'];
  if (isMoveToProject) {
    return typeof targetProjectId === 'string'
      ? { ...localTaskState, projectId: targetProjectId }
      : undefined;
  }

  const payloadKey = options.resolvePayloadKey('TASK' as EntityType);
  const syntheticDelete: Operation = {
    ...localRecreation,
    opType: OpType.Delete,
    payload: {
      actionPayload: {
        [payloadKey]: extractActionPayload(localRecreation.payload),
      },
      entityChanges: [],
    },
  };
  const [convertedRemoteOp] = convertLocalDeleteRemoteUpdatesToLww<Operation>(
    { ...conflict, localOps: [syntheticDelete], remoteOps: [remoteOp] },
    {
      payloadKey,
      toLwwUpdateActionType: (entityType) =>
        toLwwUpdateActionType(entityType as EntityType),
      isSingletonEntityId,
    },
  );
  if (!isLwwUpdatePayload(convertedRemoteOp.payload)) {
    return undefined;
  }
  const taskState = { ...extractActionPayload(convertedRemoteOp.payload) };
  delete taskState['subTasks'];

  // Generic adapter/LWW reconstruction is field-safe only. Relationship
  // changes require action-specific parent/project ordering support.
  return deepEqual(taskState['projectId'], localTaskState['projectId']) &&
    deepEqual(taskState['parentId'], localTaskState['parentId']) &&
    deepEqual(taskState['subTaskIds'], localTaskState['subTaskIds'])
    ? taskState
    : undefined;
};
