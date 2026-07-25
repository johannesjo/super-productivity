import {
  ActionType,
  extractActionPayload,
  Operation,
  OpType,
} from '../core/operation.types';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';

interface SectionMove {
  sourceSectionId: string;
  destinationSectionId: string;
  taskId: string;
}

interface SectionRemoval {
  sectionId: string;
  taskId: string;
}

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

const getSectionMove = (operation: Operation): SectionMove | undefined => {
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
    typeof sourceSectionId !== 'string' ||
    typeof destinationSectionId !== 'string' ||
    sourceSectionId === destinationSectionId ||
    typeof taskId !== 'string' ||
    !isStringOrNull(payload?.['afterTaskId']) ||
    operation.entityId !== sourceSectionId ||
    !hasExactEntityIds(operation, [sourceSectionId, destinationSectionId])
  ) {
    return undefined;
  }
  return { sourceSectionId, destinationSectionId, taskId };
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
  if (
    typeof sectionId !== 'string' ||
    typeof taskId !== 'string' ||
    typeof payload?.['workContextId'] !== 'string' ||
    (payload?.['workContextType'] !== WorkContextType.PROJECT &&
      payload?.['workContextType'] !== WorkContextType.TAG) ||
    !isStringOrNull(payload?.['workContextAfterTaskId']) ||
    operation.entityId !== sectionId ||
    !hasExactEntityIds(operation, [sectionId])
  ) {
    return undefined;
  }
  return { sectionId, taskId };
};

const getSectionOrderIds = (operation: Operation): string[] | undefined => {
  if (
    operation.actionType !== ActionType.SECTION_UPDATE_ORDER ||
    operation.entityType !== 'SECTION' ||
    operation.opType !== OpType.Move
  ) {
    return undefined;
  }
  const payload = getActionPayload(operation);
  const ids = payload?.['ids'];
  if (
    typeof payload?.['contextId'] !== 'string' ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !ids.every((id): id is string => typeof id === 'string') ||
    operation.entityId !== ids[0] ||
    !hasExactEntityIds(operation, ids)
  ) {
    return undefined;
  }
  return ids;
};

const isSectionOrderAndPlacementPair = (
  orderOperation: Operation,
  placementOperation: Operation,
): boolean => {
  const orderIds = getSectionOrderIds(orderOperation);
  if (
    !orderIds ||
    (!getSectionMove(placementOperation) && !getSectionRemoval(placementOperation))
  ) {
    return false;
  }
  return getOpEntityIds(placementOperation).some((id) => orderIds.includes(id));
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
