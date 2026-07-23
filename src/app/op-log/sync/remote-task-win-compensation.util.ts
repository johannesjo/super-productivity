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
import { toEntityKey } from '../util/entity-key.util';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';

interface RemoteTaskWinCompensationOptions {
  hasCurrentTask: boolean;
  resolvePayloadKey: (entityType: EntityType) => string;
  restoreSubTaskSnapshots?: RestoreSubTaskCompensationSnapshots;
}

export interface RestoreSubTaskCompensationSnapshots {
  winning: ReadonlyMap<string, Record<string, unknown>>;
  losing: ReadonlyMap<string, Record<string, unknown>>;
  clearSubTaskSchedule: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeEntityId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !Object.prototype.hasOwnProperty.call(Object.prototype, value);

const RESTORE_DEPENDENCY_CREATE_ACTION_TYPE: Partial<Record<EntityType, ActionType>> = {
  PROJECT: ActionType.PROJECT_ADD,
  TAG: ActionType.TAG_ADD,
  TASK_REPEAT_CFG: ActionType.REPEAT_CFG_ADD,
};

const addTaskSnapshots = (
  target: Map<string, Record<string, unknown>>,
  candidates: readonly unknown[],
  isValid: (candidate: Record<string, unknown>) => boolean = () => true,
): void => {
  for (const candidate of candidates) {
    if (!isRecord(candidate) || !isSafeEntityId(candidate['id']) || !isValid(candidate)) {
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
      ? restoredTask['subTaskIds'].filter((id): id is string => isSafeEntityId(id))
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

  return {
    winning,
    losing,
    clearSubTaskSchedule: isRecord(remotePayload['restoreToToday']),
  };
};

interface RestoreContext {
  remoteOp: Operation;
  restoreSubTaskSnapshots?: RestoreSubTaskCompensationSnapshots;
}

const getRestoreReferenceKeys = (
  restoreContexts: readonly RestoreContext[],
): Set<string> => {
  const referenceKeys = new Set<string>();
  const addReference = (entityType: EntityType, entityId: unknown): void => {
    if (isSafeEntityId(entityId)) {
      referenceKeys.add(toEntityKey(entityType, entityId));
    }
  };

  for (const { remoteOp, restoreSubTaskSnapshots } of restoreContexts) {
    if (remoteOp.actionType !== ActionType.TASK_SHARED_RESTORE) {
      continue;
    }
    const payload = extractActionPayload(remoteOp.payload);
    const restoredTask = payload['task'];
    if (!isRecord(restoredTask)) {
      continue;
    }
    const restoredTasks = [
      restoredTask,
      ...(restoreSubTaskSnapshots?.winning.values() ?? []),
      ...(restoreSubTaskSnapshots?.losing.values() ?? []),
    ];
    for (const task of restoredTasks) {
      addReference('PROJECT' as EntityType, task['projectId']);
      if (Array.isArray(task['tagIds'])) {
        for (const tagId of task['tagIds']) {
          if (tagId !== TODAY_TAG.id) {
            addReference('TAG' as EntityType, tagId);
          }
        }
      }
      addReference('TASK_REPEAT_CFG' as EntityType, task['repeatCfgId']);
    }
  }
  return referenceKeys;
};

const getFirstRestorePosition = (
  restoreContexts: readonly RestoreContext[],
  batchOps: readonly Operation[],
): { id: string; index: number } | undefined => {
  const restoreOpIds = new Set(restoreContexts.map(({ remoteOp }) => remoteOp.id));
  const index = batchOps.findIndex((op) => restoreOpIds.has(op.id));
  return index >= 0 ? { id: batchOps[index].id, index } : undefined;
};

export const findRestoreDependencyCreateOps = (
  restoreContexts: readonly RestoreContext[],
  candidates: readonly Operation[],
  resolvePayloadKey: (entityType: EntityType) => string,
  batchOps: readonly Operation[] = candidates,
): Array<Operation & { entityId: string }> => {
  if (restoreContexts.length !== 1) {
    return [];
  }
  const referenceKeys = getRestoreReferenceKeys(restoreContexts);
  const firstRestorePosition = getFirstRestorePosition(restoreContexts, batchOps);
  if (!firstRestorePosition) {
    return [];
  }
  const batchOpIndexById = new Map<string, number>();
  batchOps.forEach((op, index) => {
    if (!batchOpIndexById.has(op.id)) {
      batchOpIndexById.set(op.id, index);
    }
  });
  const batchOpIdsByEntityKey = new Map<string, Set<string>>();
  for (const batchOp of batchOps.slice(0, firstRestorePosition.index)) {
    for (const entityId of getOpEntityIds(batchOp)) {
      const entityKey = toEntityKey(batchOp.entityType, entityId);
      const opIds = batchOpIdsByEntityKey.get(entityKey) ?? new Set<string>();
      opIds.add(batchOp.id);
      batchOpIdsByEntityKey.set(entityKey, opIds);
    }
  }

  return candidates.filter((op): op is Operation & { entityId: string } => {
    const entityIds = getOpEntityIds(op);
    const batchIndex = batchOpIndexById.get(op.id);
    if (
      op.opType !== OpType.Create ||
      !isSafeEntityId(op.entityId) ||
      batchIndex === undefined ||
      batchIndex >= firstRestorePosition.index ||
      !referenceKeys.has(toEntityKey(op.entityType, op.entityId)) ||
      op.actionType !== RESTORE_DEPENDENCY_CREATE_ACTION_TYPE[op.entityType] ||
      entityIds.length !== 1
    ) {
      return false;
    }
    const entityId = op.entityId;
    const batchOpIds = batchOpIdsByEntityKey.get(toEntityKey(op.entityType, entityId));
    // Hoisting past another op for the same entity would change server order
    // (for example CREATE → DELETE → RESTORE), so only isolated creates qualify.
    if (batchOpIds?.size !== 1 || !batchOpIds.has(op.id)) {
      return false;
    }
    const entity = extractActionPayload(op.payload)[resolvePayloadKey(op.entityType)];
    return isRecord(entity) && entity['id'] === op.entityId;
  });
};

export interface RestoreDependencyPlan {
  createOps: Array<Operation & { entityId: string }>;
  createOpIds: ReadonlySet<string>;
  createOpsByRestoreOpId: ReadonlyMap<string, Array<Operation & { entityId: string }>>;
  subTaskSnapshotsByOpId: ReadonlyMap<string, RestoreSubTaskCompensationSnapshots>;
  firstRestoreOpId?: string;
}

export const buildRestoreDependencyPlan = (
  resolutions: readonly {
    winner: 'local' | 'remote';
    conflict: EntityConflict;
  }[],
  candidates: readonly Operation[],
  resolvePayloadKey: (entityType: EntityType) => string,
  batchOps: readonly Operation[] = candidates,
): RestoreDependencyPlan => {
  const subTaskSnapshotsByOpId = new Map<string, RestoreSubTaskCompensationSnapshots>();
  const restoreContexts: RestoreContext[] = [];
  const seenRestoreOpIds = new Set<string>();

  for (const resolution of resolutions) {
    if (resolution.winner !== 'remote') {
      continue;
    }
    for (const remoteOp of resolution.conflict.remoteOps) {
      if (
        remoteOp.actionType !== ActionType.TASK_SHARED_RESTORE ||
        seenRestoreOpIds.has(remoteOp.id)
      ) {
        continue;
      }
      seenRestoreOpIds.add(remoteOp.id);
      const restoreSubTaskSnapshots = buildRestoreSubTaskCompensationSnapshots(
        resolution.conflict,
        remoteOp,
      );
      if (restoreSubTaskSnapshots) {
        subTaskSnapshotsByOpId.set(remoteOp.id, restoreSubTaskSnapshots);
      }
      restoreContexts.push({ remoteOp, restoreSubTaskSnapshots });
    }
  }

  const createOps = [
    ...new Map(
      findRestoreDependencyCreateOps(
        restoreContexts,
        candidates,
        resolvePayloadKey,
        batchOps,
      ).map((op) => [op.id, op]),
    ).values(),
  ];
  const createOpsByRestoreOpId = new Map<
    string,
    Array<Operation & { entityId: string }>
  >();
  for (const restoreContext of restoreContexts) {
    const referenceKeys = getRestoreReferenceKeys([restoreContext]);
    createOpsByRestoreOpId.set(
      restoreContext.remoteOp.id,
      createOps.filter((op) =>
        referenceKeys.has(toEntityKey(op.entityType, op.entityId)),
      ),
    );
  }
  return {
    createOps,
    createOpIds: new Set(createOps.map((op) => op.id)),
    createOpsByRestoreOpId,
    subTaskSnapshotsByOpId,
    firstRestoreOpId: getFirstRestorePosition(restoreContexts, batchOps)?.id,
  };
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
    const restoredSubTasks =
      options.restoreSubTaskSnapshots ??
      buildRestoreSubTaskCompensationSnapshots(conflict, remoteOp);
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
