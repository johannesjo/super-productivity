import { Injectable } from '@angular/core';
import { IValidation } from 'typia';
import { validateAllData } from '../../../pfapi/validate/validation-fn';
import {
  isRelatedModelDataValid,
  getLastValidityError,
} from '../../../pfapi/validate/is-related-model-data-valid';
import { dataRepair } from '../../../pfapi/repair/data-repair';
import { isDataRepairPossible } from '../../../pfapi/repair/is-data-repair-possible.util';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { RepairSummary } from './operation.types';
import { PFLog } from '../../log';
import { RepairOperationService } from './repair-operation.service'; // Used for createEmptyRepairSummary()

/**
 * Type representing an NgRx entity state slice.
 */
interface EntityState<T = unknown> {
  ids: string[];
  entities: Record<string, T>;
}

/**
 * Helper to safely access entity state with proper typing.
 */
const getEntityState = (
  state: AppDataCompleteNew,
  model: 'task' | 'project' | 'tag' | 'note' | 'simpleCounter',
): EntityState | undefined => {
  const slice = state[model];
  if (
    slice &&
    typeof slice === 'object' &&
    'ids' in slice &&
    'entities' in slice &&
    Array.isArray(slice.ids)
  ) {
    return slice as EntityState;
  }
  return undefined;
};

/**
 * Helper to get archive entity state.
 */
const getArchiveEntityState = (
  state: AppDataCompleteNew,
  archiveType: 'archiveYoung' | 'archiveOld',
): EntityState | undefined => {
  const archive = state[archiveType];
  if (!archive || typeof archive !== 'object') return undefined;

  const taskState = (archive as Record<string, unknown>).task;
  if (
    taskState &&
    typeof taskState === 'object' &&
    'ids' in taskState &&
    Array.isArray((taskState as EntityState).ids)
  ) {
    return taskState as EntityState;
  }
  return undefined;
};

/**
 * Interface for task entity in the state (minimal fields needed for validation).
 */
interface TaskEntity {
  id: string;
  projectId?: string;
  tagIds?: string[];
}

/**
 * Helper to get tasks from entity state.
 */
const getTaskEntities = (state: AppDataCompleteNew): Record<string, TaskEntity> => {
  const taskState = getEntityState(state, 'task');
  return (taskState?.entities as Record<string, TaskEntity>) || {};
};

/**
 * Interface for menu tree state.
 */
interface MenuTreeState {
  items: unknown[];
}

/**
 * Result of validating application state.
 */
export interface StateValidationResult {
  isValid: boolean;
  typiaErrors: unknown[];
  crossModelError?: string;
}

/**
 * Result of validating and repairing application state.
 */
export interface ValidateAndRepairResult {
  isValid: boolean;
  wasRepaired: boolean;
  repairedState?: AppDataCompleteNew;
  repairSummary?: RepairSummary;
  error?: string;
}

/**
 * Service for validating and repairing application state.
 * Wraps PFAPI's validation (Typia + cross-model) and repair functionality.
 *
 * Validation happens at key checkpoints:
 * - Checkpoint B: After loading snapshot during hydration
 * - Checkpoint C: After replaying tail operations during hydration
 * - Checkpoint D: After applying remote operations during sync
 */
@Injectable({
  providedIn: 'root',
})
export class ValidateStateService {
  /**
   * Validates application state using both Typia schema validation
   * and cross-model relationship validation.
   */
  validateState(state: AppDataCompleteNew): StateValidationResult {
    const result: StateValidationResult = {
      isValid: true,
      typiaErrors: [],
    };

    // 1. Run Typia schema validation
    const typiaResult = validateAllData(state);
    if (!typiaResult.success) {
      result.isValid = false;
      result.typiaErrors = typiaResult.errors || [];
      PFLog.warn('[ValidateStateService] Typia validation failed', {
        errorCount: result.typiaErrors.length,
      });
    }

    // 2. Run cross-model relationship validation
    const isRelatedValid = isRelatedModelDataValid(state);
    if (!isRelatedValid) {
      result.isValid = false;
      result.crossModelError = getLastValidityError();
      PFLog.warn('[ValidateStateService] Cross-model validation failed', {
        error: result.crossModelError,
      });
    }

    if (result.isValid) {
      PFLog.normal('[ValidateStateService] State validation passed');
    }

    return result;
  }

  /**
   * Validates state and repairs if necessary.
   * Returns the (possibly repaired) state and repair summary.
   */
  validateAndRepair(state: AppDataCompleteNew): ValidateAndRepairResult {
    // First, validate the state
    const validationResult = this.validateState(state);

    if (validationResult.isValid) {
      return {
        isValid: true,
        wasRepaired: false,
      };
    }

    // State is invalid - attempt repair
    PFLog.log('[ValidateStateService] State invalid, attempting repair...');

    // Check if repair is possible
    if (!isDataRepairPossible(state)) {
      PFLog.err('[ValidateStateService] Data repair not possible - state too corrupted');
      return {
        isValid: false,
        wasRepaired: false,
        error: 'Data repair not possible - state too corrupted',
      };
    }

    try {
      // Run repair
      const typiaErrors = validationResult.typiaErrors as IValidation.IError[];
      const repairedState = dataRepair(state, typiaErrors);

      // Create repair summary based on validation errors
      const repairSummary = this._createRepairSummary(
        validationResult,
        state,
        repairedState,
      );

      // Validate the repaired state to confirm it's now valid
      const revalidationResult = this.validateState(repairedState);
      if (!revalidationResult.isValid) {
        PFLog.err('[ValidateStateService] State still invalid after repair');
        return {
          isValid: false,
          wasRepaired: true,
          repairedState,
          repairSummary,
          error: 'State still invalid after repair',
        };
      }

      PFLog.log('[ValidateStateService] State successfully repaired', {
        repairSummary,
      });

      return {
        isValid: true,
        wasRepaired: true,
        repairedState,
        repairSummary,
      };
    } catch (e) {
      PFLog.err('[ValidateStateService] Error during repair', e);
      return {
        isValid: false,
        wasRepaired: false,
        error: `Repair failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  /**
   * Creates a repair summary by analyzing what changed between original and repaired state.
   * This is an approximation based on what we can detect changed.
   */
  private _createRepairSummary(
    validationResult: StateValidationResult,
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): RepairSummary {
    const summary = RepairOperationService.createEmptyRepairSummary();

    // Count typia errors as type errors fixed
    summary.typeErrorsFixed = validationResult.typiaErrors.length;

    // Detect entity state changes (ids array sync)
    summary.entityStateFixed = this._countEntityStateChanges(original, repaired);

    // Detect relationship fixes by looking at task/project/tag counts
    summary.relationshipsFixed = this._countRelationshipChanges(original, repaired);

    // Detect orphaned entity changes
    summary.orphanedEntitiesRestored = this._countOrphanedEntityChanges(
      original,
      repaired,
    );

    // Detect invalid reference removals
    summary.invalidReferencesRemoved = this._countInvalidReferenceRemovals(
      original,
      repaired,
    );

    // Structure repairs (menu tree, inbox project)
    summary.structureRepaired = this._countStructureRepairs(original, repaired);

    return summary;
  }

  /**
   * Counts changes in entity state consistency (ids array matching entities object).
   */
  private _countEntityStateChanges(
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): number {
    let count = 0;
    const models = ['task', 'project', 'tag', 'note', 'simpleCounter'] as const;

    for (const model of models) {
      const origState = getEntityState(original, model);
      const repairedState = getEntityState(repaired, model);
      const origIds = origState?.ids?.length || 0;
      const repairedIds = repairedState?.ids?.length || 0;
      if (origIds !== repairedIds) {
        count += Math.abs(origIds - repairedIds);
      }
    }

    return count;
  }

  /**
   * Counts relationship changes (task-project, task-tag assignments).
   */
  private _countRelationshipChanges(
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): number {
    let count = 0;

    // Check if task-project assignments changed
    const origTasks = getTaskEntities(original);
    const repairedTasks = getTaskEntities(repaired);

    for (const origTask of Object.values(origTasks)) {
      const repairedTask = repairedTasks[origTask.id];
      if (repairedTask) {
        if (origTask.projectId !== repairedTask.projectId) {
          count++;
        }
        // Check tag changes
        const origTags = origTask.tagIds || [];
        const repairedTags = repairedTask.tagIds || [];
        if (origTags.length !== repairedTags.length) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Counts orphaned entity restorations.
   */
  private _countOrphanedEntityChanges(
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): number {
    let count = 0;

    // Check archive changes
    const origYoungArchive = getArchiveEntityState(original, 'archiveYoung');
    const origOldArchive = getArchiveEntityState(original, 'archiveOld');
    const repairedYoungArchive = getArchiveEntityState(repaired, 'archiveYoung');
    const repairedOldArchive = getArchiveEntityState(repaired, 'archiveOld');

    const origArchiveCount =
      (origYoungArchive?.ids?.length || 0) + (origOldArchive?.ids?.length || 0);
    const repairedArchiveCount =
      (repairedYoungArchive?.ids?.length || 0) + (repairedOldArchive?.ids?.length || 0);

    if (origArchiveCount !== repairedArchiveCount) {
      count += Math.abs(origArchiveCount - repairedArchiveCount);
    }

    return count;
  }

  /**
   * Counts invalid reference removals.
   */
  private _countInvalidReferenceRemovals(
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): number {
    let count = 0;

    // Check for tasks with removed projectIds
    const origTasks = getTaskEntities(original);
    const repairedTasks = getTaskEntities(repaired);

    for (const origTask of Object.values(origTasks)) {
      const repairedTask = repairedTasks[origTask.id];
      if (!repairedTask && origTask.projectId) {
        count++;
      }
    }

    return count;
  }

  /**
   * Counts structure repairs (menu tree, inbox project creation).
   */
  private _countStructureRepairs(
    original: AppDataCompleteNew,
    repaired: AppDataCompleteNew,
  ): number {
    let count = 0;

    // Check if inbox project was created
    const origProjectState = getEntityState(original, 'project');
    const repairedProjectState = getEntityState(repaired, 'project');
    const origProjectCount = origProjectState?.ids?.length || 0;
    const repairedProjectCount = repairedProjectState?.ids?.length || 0;
    if (repairedProjectCount > origProjectCount) {
      count++;
    }

    // Check menu tree changes
    const origMenuTree = original.menuTree as MenuTreeState | undefined;
    const repairedMenuTree = repaired.menuTree as MenuTreeState | undefined;
    const origMenuItems = origMenuTree?.items?.length || 0;
    const repairedMenuItems = repairedMenuTree?.items?.length || 0;
    if (origMenuItems !== repairedMenuItems) {
      count++;
    }

    return count;
  }
}
