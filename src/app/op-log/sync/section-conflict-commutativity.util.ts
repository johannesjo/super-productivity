import {
  ActionType,
  extractActionPayload,
  isFullStateOpType,
  Operation,
  OpType,
} from '../core/operation.types';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';

interface SectionPlacement {
  sourceSectionId: string | null;
  destinationSectionId: string;
  taskId: string;
}

interface SectionMove extends SectionPlacement {
  sourceSectionId: string;
}

interface SectionRemoval {
  sectionId: string;
  taskId: string;
  workContextId: string;
  workContextType: WorkContextType;
}

interface SectionOrder {
  contextId: string;
  sectionIds: string[];
}

interface SectionSemanticFootprint {
  writeKeys: readonly string[];
  sectionIds: readonly string[];
  taskIds: readonly string[];
  workContexts: readonly {
    id: string;
    type: WorkContextType;
  }[];
}

const SECTION_ACTIONS = new Set<ActionType>([
  ActionType.SECTION_UPDATE_ORDER,
  ActionType.SECTION_ADD_TASK,
  ActionType.SECTION_REMOVE_TASK,
]);

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const getActionPayload = (operation: Operation): Record<string, unknown> | undefined => {
  if (!operation.payload || typeof operation.payload !== 'object') {
    return undefined;
  }
  const payload = extractActionPayload(operation.payload);
  return payload && typeof payload === 'object' ? payload : undefined;
};

const hasExactEntityIds = (operation: Operation, expectedIds: string[]): boolean => {
  const uniqueExpectedIds = Array.from(new Set(expectedIds));
  const declaredIds = getOpEntityIds(operation);
  return (
    uniqueExpectedIds.length === expectedIds.length &&
    declaredIds.length === uniqueExpectedIds.length &&
    uniqueExpectedIds.every((id) => declaredIds.includes(id))
  );
};

const getSectionPlacement = (operation: Operation): SectionPlacement | undefined => {
  if (
    operation.actionType !== ActionType.SECTION_ADD_TASK ||
    operation.entityType !== 'SECTION' ||
    operation.opType !== OpType.Move
  ) {
    return undefined;
  }
  const payload = getActionPayload(operation);
  const sourceSectionId = payload?.['sourceSectionId'];
  const destinationSectionId = payload?.['sectionId'];
  const taskId = payload?.['taskId'];
  if (
    !isStringOrNull(sourceSectionId) ||
    typeof destinationSectionId !== 'string' ||
    typeof taskId !== 'string' ||
    !isStringOrNull(payload?.['afterTaskId'])
  ) {
    return undefined;
  }
  const isCrossSectionMove =
    sourceSectionId !== null && sourceSectionId !== destinationSectionId;
  const expectedEntityIds = isCrossSectionMove
    ? [sourceSectionId, destinationSectionId]
    : [destinationSectionId];
  if (
    operation.entityId !== expectedEntityIds[0] ||
    !hasExactEntityIds(operation, expectedEntityIds)
  ) {
    return undefined;
  }
  return { sourceSectionId, destinationSectionId, taskId };
};

const getSectionMove = (operation: Operation): SectionMove | undefined => {
  const placement = getSectionPlacement(operation);
  if (
    !placement ||
    typeof placement.sourceSectionId !== 'string' ||
    placement.sourceSectionId === placement.destinationSectionId
  ) {
    return undefined;
  }
  return {
    ...placement,
    sourceSectionId: placement.sourceSectionId,
  };
};

const getSectionRemoval = (operation: Operation): SectionRemoval | undefined => {
  if (
    operation.actionType !== ActionType.SECTION_REMOVE_TASK ||
    operation.entityType !== 'SECTION' ||
    operation.opType !== OpType.Update
  ) {
    return undefined;
  }
  const payload = getActionPayload(operation);
  const sectionId = payload?.['sectionId'];
  const taskId = payload?.['taskId'];
  const workContextId = payload?.['workContextId'];
  const workContextType = payload?.['workContextType'];
  if (
    typeof sectionId !== 'string' ||
    typeof taskId !== 'string' ||
    typeof workContextId !== 'string' ||
    (workContextType !== WorkContextType.PROJECT &&
      workContextType !== WorkContextType.TAG) ||
    !isStringOrNull(payload?.['workContextAfterTaskId']) ||
    operation.entityId !== sectionId ||
    !hasExactEntityIds(operation, [sectionId])
  ) {
    return undefined;
  }
  return { sectionId, taskId, workContextId, workContextType };
};

const getSectionOrder = (operation: Operation): SectionOrder | undefined => {
  if (
    operation.actionType !== ActionType.SECTION_UPDATE_ORDER ||
    operation.entityType !== 'SECTION' ||
    operation.opType !== OpType.Move
  ) {
    return undefined;
  }
  const payload = getActionPayload(operation);
  const contextId = payload?.['contextId'];
  const ids = payload?.['ids'];
  if (
    typeof contextId !== 'string' ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((id): id is string => typeof id === 'string') ||
    operation.entityId !== ids[0] ||
    !hasExactEntityIds(operation, ids)
  ) {
    return undefined;
  }
  return { contextId, sectionIds: ids };
};

const isSectionOrderAndPlacementPair = (
  orderOperation: Operation,
  placementOperation: Operation,
): boolean => {
  const order = getSectionOrder(orderOperation);
  if (
    !order ||
    (!getSectionPlacement(placementOperation) && !getSectionRemoval(placementOperation))
  ) {
    return false;
  }
  return getOpEntityIds(placementOperation).some((id) => order.sectionIds.includes(id));
};

const getSectionSemanticFootprint = (
  operation: Operation,
): SectionSemanticFootprint | undefined => {
  const order = getSectionOrder(operation);
  if (order) {
    return {
      writeKeys: [`section-order:${order.contextId}`],
      sectionIds: order.sectionIds,
      taskIds: [],
      workContexts: [],
    };
  }

  const placement = getSectionPlacement(operation);
  if (placement) {
    const sectionIds =
      placement.sourceSectionId &&
      placement.sourceSectionId !== placement.destinationSectionId
        ? [placement.sourceSectionId, placement.destinationSectionId]
        : [placement.destinationSectionId];
    return {
      writeKeys: [
        `task-placement:${placement.taskId}`,
        ...sectionIds.map((id) => `section-tasks:${id}`),
      ],
      sectionIds,
      taskIds: [placement.taskId],
      workContexts: [],
    };
  }

  const removal = getSectionRemoval(operation);
  if (removal) {
    return {
      writeKeys: [
        `task-placement:${removal.taskId}`,
        `section-tasks:${removal.sectionId}`,
        `work-context-tasks:${removal.workContextType}:${removal.workContextId}`,
      ],
      sectionIds: [removal.sectionId],
      taskIds: [removal.taskId],
      workContexts: [{ id: removal.workContextId, type: removal.workContextType }],
    };
  }

  return undefined;
};

const hasIntersection = (
  first: readonly string[],
  second: readonly string[],
): boolean => {
  const secondSet = new Set(second);
  return first.some((value) => secondSet.has(value));
};

/**
 * Recognizes the narrow SECTION operation pairs whose reducer effects commute.
 * Metadata must exactly match the authenticated action payload before a pair is
 * allowed to bypass entity-level LWW.
 */
export const areCommutingSectionOperations = (
  first: Operation,
  second: Operation,
): boolean => {
  const firstMove = getSectionMove(first);
  const secondMove = getSectionMove(second);
  const firstRemoval = getSectionRemoval(first);
  const secondRemoval = getSectionRemoval(second);

  if (
    firstMove &&
    secondRemoval &&
    firstMove.sourceSectionId === secondRemoval.sectionId &&
    firstMove.taskId === secondRemoval.taskId
  ) {
    return true;
  }
  if (
    secondMove &&
    firstRemoval &&
    secondMove.sourceSectionId === firstRemoval.sectionId &&
    secondMove.taskId === firstRemoval.taskId
  ) {
    return true;
  }

  return (
    isSectionOrderAndPlacementPair(first, second) ||
    isSectionOrderAndPlacementPair(second, first)
  );
};

/**
 * Returns stable lookup keys for operations that can affect a SECTION semantic
 * transition. `undefined` means the operation cannot be scoped safely and must
 * be treated as globally relevant; an empty array is provably unrelated.
 */
export const getSectionReplayScopeKeys = (
  operation: Operation,
): readonly string[] | undefined => {
  if (isFullStateOpType(operation.opType)) {
    return undefined;
  }

  const footprint = getSectionSemanticFootprint(operation);
  if (footprint) {
    return Array.from(
      new Set([
        ...footprint.writeKeys,
        ...footprint.sectionIds.map((id) => `section-entity:${id}`),
        ...footprint.taskIds.map((id) => `task-placement:${id}`),
        ...footprint.workContexts.map(
          ({ type, id }) => `work-context-tasks:${type}:${id}`,
        ),
      ]),
    );
  }

  if (SECTION_ACTIONS.has(operation.actionType)) {
    return undefined;
  }

  const entityIds = getOpEntityIds(operation);
  if (entityIds.length === 0) {
    return operation.entityType === 'SECTION' ? undefined : [];
  }
  switch (operation.entityType) {
    case 'SECTION':
      return entityIds.flatMap((id) => [`section-entity:${id}`, `section-tasks:${id}`]);
    case 'TASK':
      return entityIds.map((id) => `task-placement:${id}`);
    case 'PROJECT':
    case 'TAG':
      return entityIds.map((id) => `work-context-tasks:${operation.entityType}:${id}`);
    default:
      return [];
  }
};

/**
 * Whether applying `candidate` before versus after a valid SECTION transition
 * can change the result. Unknown operations fail closed only when their entity
 * footprint can touch the transition.
 */
export const canReorderSectionTransition = (
  sectionOperation: Operation,
  candidate: Operation,
): boolean => {
  const sectionFootprint = getSectionSemanticFootprint(sectionOperation);
  if (!sectionFootprint || isFullStateOpType(candidate.opType)) {
    return true;
  }

  const candidateFootprint = getSectionSemanticFootprint(candidate);
  if (candidateFootprint) {
    return (
      !areCommutingSectionOperations(sectionOperation, candidate) &&
      hasIntersection(sectionFootprint.writeKeys, candidateFootprint.writeKeys)
    );
  }

  if (SECTION_ACTIONS.has(candidate.actionType)) {
    return true;
  }

  const candidateEntityIds = getOpEntityIds(candidate);
  switch (candidate.entityType) {
    case 'SECTION':
      return (
        candidateEntityIds.length === 0 ||
        hasIntersection(sectionFootprint.sectionIds, candidateEntityIds)
      );
    case 'TASK':
      return hasIntersection(sectionFootprint.taskIds, candidateEntityIds);
    case 'PROJECT':
    case 'TAG':
      return sectionFootprint.workContexts.some(
        ({ id, type }) =>
          type === candidate.entityType && candidateEntityIds.includes(id),
      );
    default:
      return false;
  }
};
