import {
  ActionType,
  type EntityConflict,
  type EntityType,
  type Operation,
} from '../core/operation.types';
import {
  IncompleteRemoteOperationsError,
  OperationIntegrityError,
} from '../core/errors/sync-errors';
import { toEntityKey } from '../util/entity-key.util';
import {
  buildRestoreDependencyPlan,
  type RestoreDependencyPlan,
  type RestoreSubTaskCompensationSnapshots,
} from './remote-task-win-compensation.util';
import type { TaskRecreationFollowUpOptions } from './task-recreation.util';
import type { StoredOperationMetadata } from '../persistence/stored-operation-entry.util';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';

type OperationEquals = (left: unknown, right: unknown) => boolean;
type RemoteWinningResolution = {
  winner: 'local' | 'remote';
  conflict: EntityConflict;
};
type RestoreDependencyOperation = Operation & { entityId: string };

interface RemoteTaskCompensationContext {
  replayableDependencyOpsByRestoreOpId: ReadonlyMap<string, RestoreDependencyOperation[]>;
  restoreDependencyPlan: RestoreDependencyPlan;
  storedDependencyEntryByOpId: ReadonlyMap<string, StoredOperationMetadata | undefined>;
  storedPostCompensationOpIdsByRestoreOpId: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface PreparedRemoteTaskRestoreBatch {
  compensationContext: RemoteTaskCompensationContext;
  remainingNonConflictingOps: Operation[];
  remoteWinsOps: Operation[];
  replayablePrefixOps: Operation[];
}

const isPendingRemoteEntry = (entry: StoredOperationMetadata): boolean =>
  entry.source === 'remote' &&
  entry.applicationStatus === 'pending' &&
  entry.rejectedAt === undefined &&
  entry.reducerRejectedAt === undefined;

export const prepareRemoteTaskRestoreBatch = async (options: {
  resolutions: readonly RemoteWinningResolution[];
  conflicts: readonly EntityConflict[];
  nonConflictingOps: readonly Operation[];
  remoteWinsOps: readonly Operation[];
  remoteOpsInOrder?: readonly Operation[];
  resolvePayloadKey: (entityType: EntityType) => string;
  inspectStoredOperations: (
    operations: readonly Operation[],
  ) => Promise<ReadonlyMap<string, StoredOperationMetadata>>;
  operationsEqual: OperationEquals;
}): Promise<PreparedRemoteTaskRestoreBatch> => {
  const downloadedRemoteOps = options.remoteOpsInOrder ?? [
    ...options.nonConflictingOps,
    ...options.conflicts.flatMap((conflict) => conflict.remoteOps),
  ];
  const remoteBatchOpById = new Map<string, Operation>();
  for (const operation of downloadedRemoteOps) {
    const duplicate = remoteBatchOpById.get(operation.id);
    if (duplicate && !options.operationsEqual(duplicate, operation)) {
      throw new OperationIntegrityError(
        `Downloaded operations with id ${operation.id} do not match`,
      );
    }
    if (!duplicate) {
      remoteBatchOpById.set(operation.id, operation);
    }
  }
  const remoteBatchOps = [...remoteBatchOpById.values()];
  const dependencyCandidateById = new Map(
    [...options.nonConflictingOps, ...options.remoteWinsOps].map((operation) => [
      operation.id,
      operation,
    ]),
  );
  const orderedDependencyCandidates = remoteBatchOps.flatMap((operation) => {
    const candidate = dependencyCandidateById.get(operation.id);
    return candidate ? [candidate] : [];
  });
  const restoreDependencyPlan = buildRestoreDependencyPlan(
    options.resolutions,
    orderedDependencyCandidates,
    options.resolvePayloadKey,
    remoteBatchOps,
  );
  if (restoreDependencyPlan.unsafeRestoreOpIds.size > 0) {
    throw new IncompleteRemoteOperationsError(
      new Error(
        'Cannot preserve remote restore ordering safely; leaving the conflict unresolved',
      ),
    );
  }

  const firstRestoreIndex = restoreDependencyPlan.firstRestoreOpId
    ? remoteBatchOps.findIndex(
        (operation) => operation.id === restoreDependencyPlan.firstRestoreOpId,
      )
    : -1;
  const remotePrefix =
    firstRestoreIndex >= 0 ? remoteBatchOps.slice(0, firstRestoreIndex) : [];
  const remotePrefixOpIds = new Set(remotePrefix.map((operation) => operation.id));
  const nonConflictingOpIds = new Set(
    options.nonConflictingOps.map((operation) => operation.id),
  );
  const canReplayPrefix =
    restoreDependencyPlan.createOps.length > 0 &&
    restoreDependencyPlan.createOps.every((operation) =>
      remotePrefixOpIds.has(operation.id),
    ) &&
    remotePrefix.every(
      (operation) =>
        nonConflictingOpIds.has(operation.id) ||
        restoreDependencyPlan.createOpIds.has(operation.id),
    );
  if (restoreDependencyPlan.createOps.length > 0 && !canReplayPrefix) {
    throw new IncompleteRemoteOperationsError(
      new Error('Cannot preserve the complete remote prefix before task restoration'),
    );
  }
  const prefixOps = canReplayPrefix ? remotePrefix : [];
  const prefixOpIds = new Set(prefixOps.map((operation) => operation.id));
  const remainingNonConflictingOps = options.nonConflictingOps.filter(
    (operation) => !prefixOpIds.has(operation.id),
  );
  const remoteWinsOps = options.remoteWinsOps.filter(
    (operation) => !prefixOpIds.has(operation.id),
  );

  const primaryRestoreOps: Operation[] = [];
  const primaryRestoreByTaskKey = new Map<string, Operation>();
  const postCompensationOpsByRestoreOpId = new Map<string, Operation[]>();
  for (const operation of remoteBatchOps) {
    for (const entityId of getOpEntityIds(operation)) {
      const primaryRestore = primaryRestoreByTaskKey.get(
        toEntityKey(operation.entityType, entityId),
      );
      if (primaryRestore) {
        postCompensationOpsByRestoreOpId.get(primaryRestore.id)?.push(operation);
      }
    }
    if (
      restoreDependencyPlan.primaryRestoreOpIds.has(operation.id) &&
      typeof operation.entityId === 'string'
    ) {
      primaryRestoreOps.push(operation);
      primaryRestoreByTaskKey.set(
        toEntityKey(operation.entityType, operation.entityId),
        operation,
      );
      postCompensationOpsByRestoreOpId.set(operation.id, []);
    }
  }
  const operationsToInspect = [
    ...new Map(
      [
        ...prefixOps,
        ...primaryRestoreOps,
        ...[...postCompensationOpsByRestoreOpId.values()].flat(),
      ].map((operation) => [operation.id, operation]),
    ).values(),
  ];
  const storedEntriesById: ReadonlyMap<string, StoredOperationMetadata> =
    operationsToInspect.length === 0
      ? new Map()
      : await options.inspectStoredOperations(operationsToInspect);

  const replayablePrefixOps: Operation[] = [];
  const durablePrefix = [...prefixOps, ...primaryRestoreOps];
  let encounteredMissingRow = false;
  let previousStoredSeq = -1;
  for (const operation of durablePrefix) {
    const existing = storedEntriesById.get(operation.id);
    if (!existing) {
      encounteredMissingRow = true;
      if (prefixOpIds.has(operation.id)) {
        replayablePrefixOps.push(operation);
      }
      continue;
    }
    if (encounteredMissingRow || existing.seq <= previousStoredSeq) {
      throw new IncompleteRemoteOperationsError(
        new Error('Stored restore dependencies do not preserve remote operation order'),
      );
    }
    previousStoredSeq = existing.seq;
    if (prefixOpIds.has(operation.id) && isPendingRemoteEntry(existing)) {
      replayablePrefixOps.push(operation);
    }
  }

  const storedPostCompensationOpIdsByRestoreOpId = new Map<string, ReadonlySet<string>>();
  for (const [
    primaryRestoreOpId,
    postCompensationOps,
  ] of postCompensationOpsByRestoreOpId) {
    const storedPostCompensationOpIds = new Set<string>();
    for (const operation of postCompensationOps) {
      const existing = storedEntriesById.get(operation.id);
      if (!existing) {
        continue;
      }
      storedPostCompensationOpIds.add(operation.id);
    }
    storedPostCompensationOpIdsByRestoreOpId.set(
      primaryRestoreOpId,
      storedPostCompensationOpIds,
    );
  }

  const replayableDependencyOpIds = new Set(
    replayablePrefixOps
      .filter((operation) => restoreDependencyPlan.createOpIds.has(operation.id))
      .map((operation) => operation.id),
  );
  const replayableDependencyOpsByRestoreOpId = new Map(
    [...restoreDependencyPlan.createOpsByRestoreOpId].map(([restoreOpId, createOps]) => [
      restoreOpId,
      createOps.filter((operation) => replayableDependencyOpIds.has(operation.id)),
    ]),
  );
  const dependencyCandidateOpIds = new Set(
    [...restoreDependencyPlan.candidateCreateOpsByRestoreOpId.values()]
      .flat()
      .map((operation) => operation.id),
  );
  const storedDependencyEntryByOpId = new Map<
    string,
    StoredOperationMetadata | undefined
  >();
  for (const operationId of dependencyCandidateOpIds) {
    storedDependencyEntryByOpId.set(operationId, storedEntriesById.get(operationId));
  }

  return {
    compensationContext: {
      replayableDependencyOpsByRestoreOpId,
      restoreDependencyPlan,
      storedDependencyEntryByOpId,
      storedPostCompensationOpIdsByRestoreOpId,
    },
    remainingNonConflictingOps: [...remainingNonConflictingOps],
    remoteWinsOps,
    replayablePrefixOps,
  };
};

export interface RemoteTaskWinCompensationResult {
  compensatedRemoteOps: ReadonlyMap<string, Operation>;
  compensationOpIds: ReadonlySet<string>;
  compensationOps: Operation[];
  remoteWinOpIdsToRemove: ReadonlySet<string>;
}

export const createRemoteTaskWinCompensations = async (options: {
  preparedBatch: PreparedRemoteTaskRestoreBatch;
  resolutions: readonly RemoteWinningResolution[];
  getCurrentEntityState: (entityType: EntityType, entityId: string) => Promise<unknown>;
  createCompensation: (
    conflict: EntityConflict,
    remoteOp: Operation,
    restoreSubTaskSnapshots: RestoreSubTaskCompensationSnapshots | undefined,
    entityExists: (entityType: EntityType, entityId: string) => Promise<boolean>,
  ) => Promise<Operation | undefined>;
  createFollowUpOps: (
    compensationOp: Operation,
    followUpOptions: TaskRecreationFollowUpOptions,
  ) => Promise<Operation[]>;
}): Promise<RemoteTaskWinCompensationResult> => {
  const { compensationContext } = options.preparedBatch;
  const currentEntityExistsByKey = new Map<string, Promise<boolean>>();
  const currentEntityExists = (
    entityType: EntityType,
    entityId: string,
  ): Promise<boolean> => {
    const entityKey = toEntityKey(entityType, entityId);
    const cached = currentEntityExistsByKey.get(entityKey);
    if (cached) {
      return cached;
    }
    const exists = options
      .getCurrentEntityState(entityType, entityId)
      .then((entity) => entity !== undefined);
    currentEntityExistsByKey.set(entityKey, exists);
    return exists;
  };

  const compensationOps: Operation[] = [];
  const compensationOpIds = new Set<string>();
  const compensatedRemoteOps = new Map<string, Operation>();
  const remoteWinOpIdsToRemove = new Set<string>();
  for (const resolution of options.resolutions) {
    if (resolution.winner !== 'remote') {
      continue;
    }
    for (const remoteOp of resolution.conflict.remoteOps) {
      if (
        remoteOp.actionType === ActionType.TASK_SHARED_RESTORE &&
        !compensationContext.restoreDependencyPlan.primaryRestoreOpIds.has(remoteOp.id)
      ) {
        continue;
      }
      const restoreSubTaskSnapshots =
        compensationContext.restoreDependencyPlan.subTaskSnapshotsByOpId.get(remoteOp.id);
      const dependencyOps =
        compensationContext.replayableDependencyOpsByRestoreOpId.get(remoteOp.id) ?? [];
      const candidateDependencyOps =
        compensationContext.restoreDependencyPlan.candidateCreateOpsByRestoreOpId.get(
          remoteOp.id,
        ) ?? [];
      const dependencyEntityKeys = new Set(
        dependencyOps.map((operation) =>
          toEntityKey(operation.entityType, operation.entityId),
        ),
      );
      const entityExists = async (
        entityType: EntityType,
        entityId: string,
      ): Promise<boolean> =>
        dependencyEntityKeys.has(toEntityKey(entityType, entityId)) ||
        (await currentEntityExists(entityType, entityId));

      for (const candidate of candidateDependencyOps) {
        if (await entityExists(candidate.entityType, candidate.entityId)) {
          continue;
        }
        const existing = compensationContext.storedDependencyEntryByOpId.get(
          candidate.id,
        );
        if (!existing || isPendingRemoteEntry(existing)) {
          throw new IncompleteRemoteOperationsError(
            new Error(`Cannot apply restore ${remoteOp.id} before its dependencies`),
          );
        }
      }

      const compensationOp = await options.createCompensation(
        resolution.conflict,
        remoteOp,
        restoreSubTaskSnapshots,
        entityExists,
      );
      if (!compensationOp) {
        continue;
      }
      if (
        compensationContext.restoreDependencyPlan.multipleRestoreRootOpIds.has(
          remoteOp.id,
        )
      ) {
        throw new IncompleteRemoteOperationsError(
          new Error('Cannot compensate multiple restored task roots in one batch'),
        );
      }
      if (
        (compensationContext.storedPostCompensationOpIdsByRestoreOpId.get(remoteOp.id)
          ?.size ?? 0) > 0
      ) {
        throw new IncompleteRemoteOperationsError(
          new Error(
            `Cannot insert restore compensation before already stored operations for ${remoteOp.id}`,
          ),
        );
      }
      compensationOps.push(compensationOp);
      compensationOpIds.add(compensationOp.id);
      const followUpOps = await options.createFollowUpOps(compensationOp, {
        ensureRegularProjectMembership:
          remoteOp.actionType === ActionType.TASK_SHARED_MOVE_TO_PROJECT ||
          remoteOp.actionType === ActionType.TASK_SHARED_RESTORE,
        restoreSubTaskSnapshots,
        requireComplete: remoteOp.actionType === ActionType.TASK_SHARED_RESTORE,
        entityExists,
      });
      compensationOps.push(...followUpOps);
      followUpOps.forEach((operation) => compensationOpIds.add(operation.id));
      compensatedRemoteOps.set(remoteOp.id, remoteOp);
      remoteWinOpIdsToRemove.add(remoteOp.id);
    }
  }

  return {
    compensatedRemoteOps,
    compensationOpIds,
    compensationOps,
    remoteWinOpIdsToRemove,
  };
};
