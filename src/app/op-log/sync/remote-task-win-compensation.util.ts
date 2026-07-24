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

interface IndexedOperation {
  op: Operation;
  index: number;
}

interface IndexedRestoreDependencyCreate extends IndexedOperation {
  op: Operation & { entityId: string };
}

interface RestoreDependencyBatchIndex {
  candidateOpIds: ReadonlySet<string>;
  candidateCreatesByEntityKey: ReadonlyMap<
    string,
    readonly IndexedRestoreDependencyCreate[]
  >;
  nonUpdateOpsByEntityKey: ReadonlyMap<string, readonly IndexedOperation[]>;
  opIndexById: ReadonlyMap<string, number>;
  opsByEntityKey: ReadonlyMap<string, readonly IndexedOperation[]>;
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

const isAuthenticatedRestoreDependencyCreate = (
  op: Operation,
  resolvePayloadKey: (entityType: EntityType) => string,
  entityIds: readonly string[] = getOpEntityIds(op),
): op is Operation & { entityId: string } => {
  if (
    op.opType !== OpType.Create ||
    !isSafeEntityId(op.entityId) ||
    op.actionType !== RESTORE_DEPENDENCY_CREATE_ACTION_TYPE[op.entityType] ||
    entityIds.length !== 1
  ) {
    return false;
  }
  const entity = extractActionPayload(op.payload)[resolvePayloadKey(op.entityType)];
  return isRecord(entity) && entity['id'] === op.entityId;
};

const buildRestoreDependencyBatchIndex = (
  candidates: readonly Operation[],
  batchOps: readonly Operation[],
  resolvePayloadKey: (entityType: EntityType) => string,
): RestoreDependencyBatchIndex => {
  const candidateOpIds = new Set(candidates.map((op) => op.id));
  const candidateCreatesByEntityKey = new Map<string, IndexedRestoreDependencyCreate[]>();
  const nonUpdateOpsByEntityKey = new Map<string, IndexedOperation[]>();
  const opIndexById = new Map<string, number>();
  const opsByEntityKey = new Map<string, IndexedOperation[]>();
  batchOps.forEach((op, index) => {
    if (!opIndexById.has(op.id)) {
      opIndexById.set(op.id, index);
    }
    const entityIds = getOpEntityIds(op);
    const indexedOperation = { op, index };
    for (const entityId of entityIds) {
      const entityKey = toEntityKey(op.entityType, entityId);
      const indexedOps = opsByEntityKey.get(entityKey) ?? [];
      indexedOps.push(indexedOperation);
      opsByEntityKey.set(entityKey, indexedOps);
      if (op.opType !== OpType.Update) {
        const nonUpdateOps = nonUpdateOpsByEntityKey.get(entityKey) ?? [];
        nonUpdateOps.push(indexedOperation);
        nonUpdateOpsByEntityKey.set(entityKey, nonUpdateOps);
      }
    }
    if (
      candidateOpIds.has(op.id) &&
      isAuthenticatedRestoreDependencyCreate(op, resolvePayloadKey, entityIds)
    ) {
      const entityKey = toEntityKey(op.entityType, op.entityId);
      const candidateCreates = candidateCreatesByEntityKey.get(entityKey) ?? [];
      candidateCreates.push({ op, index });
      candidateCreatesByEntityKey.set(entityKey, candidateCreates);
    }
  });
  return {
    candidateOpIds,
    candidateCreatesByEntityKey,
    nonUpdateOpsByEntityKey,
    opIndexById,
    opsByEntityKey,
  };
};

interface RestoreDependencySelection {
  candidates: Array<Operation & { entityId: string }>;
  safeCreates: Array<Operation & { entityId: string }>;
}

const findFirstOperationAtOrAfter = (
  operations: readonly IndexedOperation[],
  targetIndex: number,
): number => {
  let low = 0;
  let high = operations.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (operations[middle].index < targetIndex) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const buildRestoreDependencySelection = (
  restoreContext: RestoreContext,
  resolvePayloadKey: (entityType: EntityType) => string,
  batchIndex: RestoreDependencyBatchIndex,
): RestoreDependencySelection => {
  const restoreIndex = batchIndex.opIndexById.get(restoreContext.remoteOp.id);
  if (restoreIndex === undefined) {
    return { candidates: [], safeCreates: [] };
  }

  const candidates: Array<Operation & { entityId: string }> = [];
  const safeCreateByEntityKey = new Map<string, Operation & { entityId: string }>();
  for (const entityKey of getRestoreReferenceKeys([restoreContext])) {
    const candidateCreates = batchIndex.candidateCreatesByEntityKey.get(entityKey) ?? [];
    const candidateEnd = findFirstOperationAtOrAfter(candidateCreates, restoreIndex);
    candidates.push(...candidateCreates.slice(0, candidateEnd).map(({ op }) => op));

    // The last authenticated create whose remaining chain contains updates
    // only establishes the entity in the exact state seen by the restore.
    const nonUpdateOps = batchIndex.nonUpdateOpsByEntityKey.get(entityKey) ?? [];
    const nonUpdateEnd = findFirstOperationAtOrAfter(nonUpdateOps, restoreIndex);
    const lastNonUpdate = nonUpdateOps[nonUpdateEnd - 1]?.op;
    if (
      lastNonUpdate &&
      batchIndex.candidateOpIds.has(lastNonUpdate.id) &&
      isAuthenticatedRestoreDependencyCreate(lastNonUpdate, resolvePayloadKey)
    ) {
      safeCreateByEntityKey.set(entityKey, lastNonUpdate);
    }
  }

  const sortByBatchIndex = (
    a: Operation & { entityId: string },
    b: Operation & { entityId: string },
  ): number =>
    (batchIndex.opIndexById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
    (batchIndex.opIndexById.get(b.id) ?? Number.MAX_SAFE_INTEGER);
  return {
    candidates: [...new Map(candidates.map((op) => [op.id, op])).values()].sort(
      sortByBatchIndex,
    ),
    safeCreates: [...safeCreateByEntityKey.values()].sort(sortByBatchIndex),
  };
};

export interface RestoreDependencyPlan {
  createOps: Array<Operation & { entityId: string }>;
  createOpIds: ReadonlySet<string>;
  createOpsByRestoreOpId: ReadonlyMap<string, Array<Operation & { entityId: string }>>;
  candidateCreateOpsByRestoreOpId: ReadonlyMap<
    string,
    Array<Operation & { entityId: string }>
  >;
  subTaskSnapshotsByOpId: ReadonlyMap<string, RestoreSubTaskCompensationSnapshots>;
  multipleRestoreRootOpIds: ReadonlySet<string>;
  primaryRestoreOpIds: ReadonlySet<string>;
  unsafeRestoreOpIds: ReadonlySet<string>;
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

  const batchIndex = buildRestoreDependencyBatchIndex(
    candidates,
    batchOps,
    resolvePayloadKey,
  );
  const orderedRestoreContexts = restoreContexts
    .map((context, fallbackIndex) => ({
      context,
      index:
        batchIndex.opIndexById.get(context.remoteOp.id) ??
        batchOps.length + fallbackIndex,
    }))
    .sort((a, b) => a.index - b.index)
    .map(({ context }) => context);
  const restoreContextGroups = new Map<
    string,
    { primary: RestoreContext; later: RestoreContext[] }
  >();
  for (const context of orderedRestoreContexts) {
    const taskKey = isSafeEntityId(context.remoteOp.entityId)
      ? toEntityKey(context.remoteOp.entityType, context.remoteOp.entityId)
      : `INVALID:${context.remoteOp.id}`;
    const group = restoreContextGroups.get(taskKey);
    if (group) {
      group.later.push(context);
    } else {
      restoreContextGroups.set(taskKey, { primary: context, later: [] });
    }
  }
  const primaryRestoreContexts = [...restoreContextGroups.values()].map(
    ({ primary }) => primary,
  );

  const primaryRestoreOpIds = new Set(
    primaryRestoreContexts.map(({ remoteOp }) => remoteOp.id),
  );
  const multipleRestoreRootOpIds =
    primaryRestoreContexts.length > 1 ? new Set(primaryRestoreOpIds) : new Set<string>();
  const unsafeRestoreOpIds = new Set<string>();
  for (const [taskKey, { primary: primaryContext, later }] of restoreContextGroups) {
    const primaryIndex = batchIndex.opIndexById.get(primaryContext.remoteOp.id);
    if (primaryIndex === undefined || !isSafeEntityId(primaryContext.remoteOp.entityId)) {
      unsafeRestoreOpIds.add(primaryContext.remoteOp.id);
      continue;
    }
    const sameTaskOps = batchIndex.opsByEntityKey.get(taskKey) ?? [];
    let sameTaskOpIndex = 0;
    let hasUnsafeIntermediateOp = false;
    for (const laterRestore of later) {
      const laterIndex = batchIndex.opIndexById.get(laterRestore.remoteOp.id);
      if (laterIndex === undefined) {
        unsafeRestoreOpIds.add(primaryContext.remoteOp.id);
        unsafeRestoreOpIds.add(laterRestore.remoteOp.id);
        continue;
      }
      while (
        sameTaskOpIndex < sameTaskOps.length &&
        sameTaskOps[sameTaskOpIndex].index < laterIndex
      ) {
        const { op, index } = sameTaskOps[sameTaskOpIndex];
        if (
          index > primaryIndex &&
          op.actionType !== ActionType.TASK_SHARED_RESTORE &&
          op.opType !== OpType.Update
        ) {
          hasUnsafeIntermediateOp = true;
        }
        sameTaskOpIndex++;
      }
      if (hasUnsafeIntermediateOp) {
        unsafeRestoreOpIds.add(primaryContext.remoteOp.id);
        unsafeRestoreOpIds.add(laterRestore.remoteOp.id);
      }
    }
  }

  const createOpsByRestoreOpId = new Map<
    string,
    Array<Operation & { entityId: string }>
  >();
  const candidateCreateOpsByRestoreOpId = new Map<
    string,
    Array<Operation & { entityId: string }>
  >();
  const createOpsById = new Map<string, Operation & { entityId: string }>();
  for (const restoreContext of primaryRestoreContexts) {
    const selection = buildRestoreDependencySelection(
      restoreContext,
      resolvePayloadKey,
      batchIndex,
    );
    createOpsByRestoreOpId.set(restoreContext.remoteOp.id, selection.safeCreates);
    candidateCreateOpsByRestoreOpId.set(restoreContext.remoteOp.id, selection.candidates);
    selection.safeCreates.forEach((op) => createOpsById.set(op.id, op));
    const safeEntityKeys = new Set(
      selection.safeCreates.map((op) => toEntityKey(op.entityType, op.entityId)),
    );
    if (
      selection.candidates.some(
        (op) => !safeEntityKeys.has(toEntityKey(op.entityType, op.entityId)),
      )
    ) {
      unsafeRestoreOpIds.add(restoreContext.remoteOp.id);
    }
  }
  const createOps = [...createOpsById.values()].sort(
    (a, b) =>
      (batchIndex.opIndexById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (batchIndex.opIndexById.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
  return {
    createOps,
    createOpIds: new Set(createOps.map((op) => op.id)),
    createOpsByRestoreOpId,
    candidateCreateOpsByRestoreOpId,
    subTaskSnapshotsByOpId,
    multipleRestoreRootOpIds,
    primaryRestoreOpIds,
    unsafeRestoreOpIds,
    firstRestoreOpId: primaryRestoreContexts[0]?.remoteOp.id,
  };
};

export const selectRestoreSubTaskCompensationState = (
  current: Record<string, unknown> | undefined,
  winning: Record<string, unknown> | undefined,
  losing: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!current) {
    // A child removed after the rejected undo has an independent later delete.
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
