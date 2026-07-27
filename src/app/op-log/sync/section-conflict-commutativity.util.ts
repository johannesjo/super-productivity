import {
  ActionType,
  extractActionPayload,
  isMultiEntityPayload,
  Operation,
  OpType,
} from '../core/operation.types';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { getOpEntityIds } from '../util/get-op-entity-ids.util';
import { Section, SectionState } from '../../features/section/section.model';
import { ProjectState } from '../../features/project/project.model';
import { TagState } from '../../features/tag/tag.model';

interface SectionPlacement {
  sourceSectionId: string | null;
  destinationSectionId: string;
  taskId: string;
  afterTaskId: string | null;
}

interface SectionMove extends SectionPlacement {
  sourceSectionId: string;
}

interface SectionRemoval {
  sectionId: string;
  taskId: string;
  workContextId: string;
  workContextType: WorkContextType;
  workContextAfterTaskId: string | null;
}

interface SectionOrder {
  contextId: string;
  sectionIds: string[];
}

export interface SectionReplaySnapshot {
  section: SectionState;
  project: ProjectState;
  tag: TagState;
}

export type SectionReplayProjection =
  | { kind: 'replay'; operation: Operation }
  | { kind: 'superseded' }
  | { kind: 'blocked'; reason: string };

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
  const afterTaskId = payload?.['afterTaskId'];
  if (
    !isStringOrNull(sourceSectionId) ||
    typeof destinationSectionId !== 'string' ||
    typeof taskId !== 'string' ||
    !isStringOrNull(afterTaskId)
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
  return { sourceSectionId, destinationSectionId, taskId, afterTaskId };
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
  const workContextAfterTaskId = payload?.['workContextAfterTaskId'];
  if (
    typeof sectionId !== 'string' ||
    typeof taskId !== 'string' ||
    typeof workContextId !== 'string' ||
    (workContextType !== WorkContextType.PROJECT &&
      workContextType !== WorkContextType.TAG) ||
    !isStringOrNull(workContextAfterTaskId) ||
    operation.entityId !== sectionId ||
    !hasExactEntityIds(operation, [sectionId])
  ) {
    return undefined;
  }
  return {
    sectionId,
    taskId,
    workContextId,
    workContextType,
    workContextAfterTaskId,
  };
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

const withActionPayload = (
  operation: Operation,
  actionPayload: Record<string, unknown>,
): Operation => ({
  ...operation,
  payload: isMultiEntityPayload(operation.payload)
    ? { ...operation.payload, actionPayload, entityChanges: [] }
    : actionPayload,
});

const withEntityFootprint = (
  operation: Operation,
  entityIds: readonly string[],
): Operation => {
  const next = {
    ...operation,
    entityId: entityIds[0],
  };
  if (entityIds.length > 1) {
    next.entityIds = [...entityIds];
  } else {
    delete next.entityIds;
  }
  return next;
};

const getCurrentAnchor = (
  taskId: string,
  taskIds: readonly string[],
): { afterTaskId: string | null } | undefined => {
  const index = taskIds.indexOf(taskId);
  if (index === -1 || taskIds.lastIndexOf(taskId) !== index) {
    return undefined;
  }
  return { afterTaskId: index === 0 ? null : taskIds[index - 1] };
};

const getCurrentSectionsForTask = (state: SectionState, taskId: string): Section[] =>
  Object.values(state.entities).filter(
    (section): section is Section => !!section && section.taskIds.includes(taskId),
  );

const getWorkContextTaskIds = (
  snapshot: SectionReplaySnapshot,
  type: WorkContextType,
  id: string,
): readonly string[] | undefined =>
  type === WorkContextType.TAG
    ? snapshot.tag.entities[id]?.taskIds
    : snapshot.project.entities[id]?.taskIds;

const createPlacementReplay = (
  operation: Operation,
  placement: SectionPlacement,
  destination: Section,
): Operation => {
  const currentAnchor = getCurrentAnchor(placement.taskId, destination.taskIds);
  if (!currentAnchor) {
    return operation;
  }
  const entityIds =
    placement.sourceSectionId && placement.sourceSectionId !== destination.id
      ? [placement.sourceSectionId, destination.id]
      : [destination.id];
  return withEntityFootprint(
    withActionPayload(operation, {
      sectionId: destination.id,
      taskId: placement.taskId,
      afterTaskId: currentAnchor.afterTaskId,
      sourceSectionId: placement.sourceSectionId,
    }),
    entityIds,
  );
};

const createRemovalReplay = (
  operation: Operation,
  removal: SectionRemoval,
  afterTaskId: string | null,
): Operation =>
  withEntityFootprint(
    withActionPayload(
      {
        ...operation,
        actionType: ActionType.SECTION_REMOVE_TASK,
        opType: OpType.Update,
      },
      {
        sectionId: removal.sectionId,
        taskId: removal.taskId,
        workContextId: removal.workContextId,
        workContextType: removal.workContextType,
        workContextAfterTaskId: afterTaskId,
      },
    ),
    [removal.sectionId],
  );

/**
 * Projects a causally accepted SECTION intent onto the current, stable NgRx
 * frontier. The replacement is built from current ordering rather than a stale
 * anchor, so every already-applied local successor is represented without
 * action-family whitelists. A replay result must be a local no-op.
 */
export const projectSectionReplayAgainstState = (
  operation: Operation,
  snapshot: SectionReplaySnapshot,
): SectionReplayProjection => {
  const order = getSectionOrder(operation);
  if (order) {
    const currentIds = snapshot.section.ids.filter(
      (id) => snapshot.section.entities[id]?.contextId === order.contextId,
    );
    if (currentIds.length === 0) {
      return { kind: 'superseded' };
    }
    return {
      kind: 'replay',
      operation: withEntityFootprint(
        withActionPayload(operation, {
          contextId: order.contextId,
          ids: currentIds,
        }),
        currentIds,
      ),
    };
  }

  const placement = getSectionPlacement(operation);
  if (placement) {
    const currentSections = getCurrentSectionsForTask(snapshot.section, placement.taskId);
    if (currentSections.length > 1) {
      return {
        kind: 'blocked',
        reason: `task ${placement.taskId} belongs to multiple sections`,
      };
    }
    if (currentSections.length === 1) {
      const destination = currentSections[0];
      const currentAnchor = getCurrentAnchor(placement.taskId, destination.taskIds);
      if (!currentAnchor) {
        return {
          kind: 'blocked',
          reason: `task ${placement.taskId} has ambiguous section ordering`,
        };
      }
      return {
        kind: 'replay',
        operation: createPlacementReplay(operation, placement, destination),
      };
    }

    const contextSection =
      (placement.sourceSectionId
        ? snapshot.section.entities[placement.sourceSectionId]
        : undefined) ?? snapshot.section.entities[placement.destinationSectionId];
    if (!contextSection) {
      return { kind: 'superseded' };
    }
    const contextTaskIds = getWorkContextTaskIds(
      snapshot,
      contextSection.contextType,
      contextSection.contextId,
    );
    const currentAnchor = contextTaskIds
      ? getCurrentAnchor(placement.taskId, contextTaskIds)
      : undefined;
    if (!currentAnchor) {
      return { kind: 'superseded' };
    }
    return {
      kind: 'replay',
      operation: createRemovalReplay(
        operation,
        {
          sectionId: placement.sourceSectionId ?? placement.destinationSectionId,
          taskId: placement.taskId,
          workContextId: contextSection.contextId,
          workContextType: contextSection.contextType,
          workContextAfterTaskId: currentAnchor.afterTaskId,
        },
        currentAnchor.afterTaskId,
      ),
    };
  }

  const removal = getSectionRemoval(operation);
  if (removal) {
    if (snapshot.section.entities[removal.sectionId]?.taskIds.includes(removal.taskId)) {
      return {
        kind: 'blocked',
        reason: `section ${removal.sectionId} still contains task ${removal.taskId}`,
      };
    }
    const contextTaskIds = getWorkContextTaskIds(
      snapshot,
      removal.workContextType,
      removal.workContextId,
    );
    const currentAnchor = contextTaskIds
      ? getCurrentAnchor(removal.taskId, contextTaskIds)
      : undefined;
    if (!currentAnchor) {
      return { kind: 'superseded' };
    }
    return {
      kind: 'replay',
      operation: createRemovalReplay(operation, removal, currentAnchor.afterTaskId),
    };
  }

  return { kind: 'blocked', reason: 'operation is not a valid SECTION transition' };
};
