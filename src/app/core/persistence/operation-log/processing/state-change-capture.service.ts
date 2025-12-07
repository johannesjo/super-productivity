import { Injectable } from '@angular/core';
import { EntityChange, EntityType, OpType } from '../operation.types';
import { PersistentAction } from '../persistent-action.interface';
import { RootState } from '../../../../root-store/root-state';
import { TASK_FEATURE_NAME } from '../../../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME } from '../../../../features/tag/store/tag.reducer';
import { PROJECT_FEATURE_NAME } from '../../../../features/project/store/project.reducer';
import { NOTE_FEATURE_NAME } from '../../../../features/note/store/note.reducer';
import { CONFIG_FEATURE_NAME } from '../../../../features/config/store/global-config.reducer';
import { plannerFeatureKey } from '../../../../features/planner/store/planner.reducer';
import { menuTreeFeatureKey } from '../../../../features/menu-tree/store/menu-tree.reducer';
import { BOARDS_FEATURE_NAME } from '../../../../features/boards/store/boards.reducer';
import { OpLog } from '../../../log';

/**
 * Maps EntityType to NgRx feature name in RootState.
 * Only includes entity types that are stored in NgRx entity adapters.
 */
const ENTITY_TYPE_TO_FEATURE: Partial<Record<EntityType, string>> = {
  TASK: TASK_FEATURE_NAME,
  TAG: TAG_FEATURE_NAME,
  PROJECT: PROJECT_FEATURE_NAME,
  NOTE: NOTE_FEATURE_NAME,
  GLOBAL_CONFIG: CONFIG_FEATURE_NAME,
  PLANNER: plannerFeatureKey,
  MENU_TREE: menuTreeFeatureKey,
  BOARD: BOARDS_FEATURE_NAME,
};

/**
 * Maps action types to the entity types they can potentially affect.
 * This limits which features we diff, improving performance.
 *
 * Note: Action type keys intentionally use NgRx action type format.
 */
/* eslint-disable @typescript-eslint/naming-convention */
const ACTION_AFFECTED_ENTITIES: Record<string, EntityType[]> = {
  // Task CRUD operations affect tasks, tags, and projects
  '[TaskShared] Add Task': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Update Task': ['TASK', 'TAG'],
  '[TaskShared] Delete Task': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Delete Tasks': ['TASK', 'TAG', 'PROJECT'],

  // Scheduling operations affect tasks and tags (TODAY tag)
  '[TaskShared] Schedule Task with Time': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Re-Schedule Task with Time': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Unschedule Task': ['TASK', 'TAG'],
  '[TaskShared] Dismiss Reminder Only': ['TASK'],
  '[TaskShared] Plan Tasks for Today': ['TASK', 'TAG'],
  '[TaskShared] Remove Tasks from Today Tag': ['TASK', 'TAG'],

  // Archive operations
  '[TaskShared] Move to Archive': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Restore Task': ['TASK', 'TAG', 'PROJECT'],

  // Project operations
  '[TaskShared] Move to Other Project': ['TASK', 'TAG', 'PROJECT'],
  '[TaskShared] Convert to Main Task': ['TASK', 'TAG', 'PROJECT'],

  // Tag operations - deleting tags affects tasks
  '[Tag] Delete Tag': ['TAG', 'TASK'],
  '[Tag] Delete Tags': ['TAG', 'TASK'],
  '[Tag] Update Tag': ['TAG'],
  '[Tag] Add Tag': ['TAG'],

  // Project operations
  '[Project] Add Project': ['PROJECT'],
  '[Project] Update Project': ['PROJECT'],

  // Note operations
  '[Note] Add Note': ['NOTE', 'PROJECT'],
  '[Note] Update Note': ['NOTE'],
  '[Note] Delete Note': ['NOTE', 'PROJECT'],

  // Config operations
  '[GlobalConfig] Update Global Config Section': ['GLOBAL_CONFIG'],

  // Planner operations
  '[Planner] Plan Task for Day': ['TASK', 'TAG', 'PLANNER'],
  '[Planner] Transfer Task': ['TASK', 'TAG', 'PLANNER'],
  '[Planner] Move Before Task in Day': ['PLANNER'],
  '[Planner] Move Task to End of Day': ['PLANNER'],
  '[Planner] Clean up Old Planned Days And Undefined Tasks': ['PLANNER'],
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Default entity types to check if action type is not in the mapping.
 * This is a safe fallback that checks the most commonly affected entities.
 */
const DEFAULT_AFFECTED_ENTITIES: EntityType[] = ['TASK', 'TAG', 'PROJECT'];

interface PendingCapture {
  action: PersistentAction;
  beforeState: Partial<RootState>;
  capturedAt: number;
}

/**
 * Service that captures state changes for multi-entity operations.
 *
 * Flow:
 * 1. Meta-reducer calls `captureBeforeState()` before passing action to reducers
 * 2. After reducers run, effect calls `computeEntityChanges()` with after-state
 * 3. Service computes diff and returns EntityChange[]
 *
 * This eliminates the need for SideEffectExtractorService by capturing actual
 * state changes rather than trying to predict them from action payloads.
 */
@Injectable({
  providedIn: 'root',
})
export class StateChangeCaptureService {
  /**
   * Pending captures keyed by a unique identifier for each action.
   * Uses WeakMap-like cleanup to prevent memory leaks.
   */
  private pendingCaptures = new Map<string, PendingCapture>();

  /**
   * Maximum age of pending captures before they're considered stale (5 seconds).
   * This handles cases where an action is captured but never consumed.
   */
  private readonly MAX_CAPTURE_AGE_MS = 5000;

  /**
   * Captures relevant state slices before an action is processed by reducers.
   * Called by the state-capture meta-reducer.
   *
   * @param action The persistent action about to be processed
   * @param state The current root state (before action)
   */
  captureBeforeState(action: PersistentAction, state: RootState): void {
    const captureId = this.generateCaptureId(action);

    // Clean up any stale captures
    this.cleanupStaleCaptures();

    // Only capture the relevant state slices for this action type
    const affectedTypes = this.getAffectedEntityTypes(action);
    const beforeState: Partial<RootState> = {};

    for (const entityType of affectedTypes) {
      const featureName = ENTITY_TYPE_TO_FEATURE[entityType];
      if (featureName && state[featureName as keyof RootState]) {
        // Deep clone the entities to capture the before state
        const featureState = state[featureName as keyof RootState] as any;
        if (featureState?.entities) {
          beforeState[featureName as keyof RootState] = {
            ...featureState,
            entities: { ...featureState.entities },
          } as any;
        } else {
          // For non-entity states (like globalConfig), clone the whole thing
          beforeState[featureName as keyof RootState] = { ...featureState };
        }
      }
    }

    this.pendingCaptures.set(captureId, {
      action,
      beforeState,
      capturedAt: Date.now(),
    });

    OpLog.verbose('StateChangeCaptureService: Captured before-state', {
      captureId,
      actionType: action.type,
      affectedTypes,
    });
  }

  /**
   * Computes entity changes by diffing before and after states.
   * Called by the effect after reducers have processed the action.
   *
   * @param action The persistent action that was processed
   * @param afterState The root state after the action was processed
   * @returns Array of entity changes, empty if no capture found or no changes
   */
  computeEntityChanges(action: PersistentAction, afterState: RootState): EntityChange[] {
    const captureId = this.generateCaptureId(action);
    const capture = this.pendingCaptures.get(captureId);

    if (!capture) {
      OpLog.warn('StateChangeCaptureService: No capture found for action', {
        actionType: action.type,
        captureId,
      });
      return [];
    }

    // Remove the capture
    this.pendingCaptures.delete(captureId);

    const changes: EntityChange[] = [];
    const affectedTypes = this.getAffectedEntityTypes(action);

    for (const entityType of affectedTypes) {
      const featureName = ENTITY_TYPE_TO_FEATURE[entityType];
      if (!featureName) continue;

      const beforeFeature = capture.beforeState[featureName as keyof RootState] as any;
      const afterFeature = afterState[featureName as keyof RootState] as any;

      if (!beforeFeature || !afterFeature) continue;

      // Handle entity adapter states (with entities object)
      if (beforeFeature.entities && afterFeature.entities) {
        const entityChanges = this.diffEntityState(
          entityType,
          beforeFeature.entities,
          afterFeature.entities,
        );
        changes.push(...entityChanges);
      } else {
        // Handle singleton states (like globalConfig)
        const singletonChange = this.diffSingletonState(
          entityType,
          beforeFeature,
          afterFeature,
        );
        if (singletonChange) {
          changes.push(singletonChange);
        }
      }
    }

    OpLog.verbose('StateChangeCaptureService: Computed entity changes', {
      actionType: action.type,
      changeCount: changes.length,
      changes: changes.map((c) => ({
        entityType: c.entityType,
        entityId: c.entityId,
        opType: c.opType,
      })),
    });

    return changes;
  }

  /**
   * Checks if an action has a pending capture (for testing/debugging).
   */
  hasPendingCapture(action: PersistentAction): boolean {
    return this.pendingCaptures.has(this.generateCaptureId(action));
  }

  /**
   * Gets the count of pending captures (for monitoring).
   */
  getPendingCaptureCount(): number {
    return this.pendingCaptures.size;
  }

  /**
   * Generates a unique ID for an action to correlate before/after captures.
   * Uses action type + primary entity info + timestamp for uniqueness.
   */
  private generateCaptureId(action: PersistentAction): string {
    // Use entity ID if available, otherwise use a combination of properties
    const entityKey = action.meta.entityId || action.meta.entityIds?.join(',') || 'no-id';
    // Include a hash of the action to handle same entity multiple times
    const actionHash = this.simpleHash(JSON.stringify(action));
    return `${action.type}:${entityKey}:${actionHash}`;
  }

  /**
   * Simple hash function for generating unique IDs.
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Gets the entity types that could be affected by an action.
   */
  private getAffectedEntityTypes(action: PersistentAction): EntityType[] {
    const mapped = ACTION_AFFECTED_ENTITIES[action.type];
    if (mapped) {
      return mapped;
    }

    // If action type not mapped, use the primary entity type + defaults
    const primaryType = action.meta.entityType;
    if (primaryType && primaryType !== 'ALL') {
      // Include the primary type plus common related types
      const types = new Set<EntityType>([primaryType]);

      // Task-related actions often affect tags and projects
      if (primaryType === 'TASK') {
        types.add('TAG');
        types.add('PROJECT');
      }

      return Array.from(types);
    }

    return DEFAULT_AFFECTED_ENTITIES;
  }

  /**
   * Diffs two entity adapter states and returns entity changes.
   */
  private diffEntityState(
    entityType: EntityType,
    beforeEntities: Record<string, unknown>,
    afterEntities: Record<string, unknown>,
  ): EntityChange[] {
    const changes: EntityChange[] = [];
    const beforeIds = new Set(Object.keys(beforeEntities));
    const afterIds = new Set(Object.keys(afterEntities));

    // Find created entities (in after but not in before)
    for (const id of afterIds) {
      if (!beforeIds.has(id)) {
        changes.push({
          entityType,
          entityId: id,
          opType: OpType.Create,
          changes: afterEntities[id],
        });
      }
    }

    // Find deleted entities (in before but not in after)
    for (const id of beforeIds) {
      if (!afterIds.has(id)) {
        changes.push({
          entityType,
          entityId: id,
          opType: OpType.Delete,
          changes: { id },
        });
      }
    }

    // Find updated entities (in both, but changed)
    for (const id of afterIds) {
      if (beforeIds.has(id)) {
        const diff = this.computeObjectDiff(
          beforeEntities[id] as Record<string, unknown>,
          afterEntities[id] as Record<string, unknown>,
        );
        if (diff && Object.keys(diff).length > 0) {
          changes.push({
            entityType,
            entityId: id,
            opType: OpType.Update,
            changes: diff,
          });
        }
      }
    }

    return changes;
  }

  /**
   * Diffs two singleton states (non-entity-adapter states).
   */
  private diffSingletonState(
    entityType: EntityType,
    beforeState: Record<string, unknown>,
    afterState: Record<string, unknown>,
  ): EntityChange | null {
    const diff = this.computeObjectDiff(beforeState, afterState);
    if (diff && Object.keys(diff).length > 0) {
      return {
        entityType,
        entityId: '*', // Singleton marker
        opType: OpType.Update,
        changes: diff,
      };
    }
    return null;
  }

  /**
   * Computes a shallow diff between two objects, returning only changed fields.
   * Returns null if objects are identical.
   */
  private computeObjectDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const diff: Record<string, unknown> = {};
    let hasChanges = false;

    // Check all keys in after object
    for (const key of Object.keys(after)) {
      const beforeVal = before[key];
      const afterVal = after[key];

      if (!this.isEqual(beforeVal, afterVal)) {
        diff[key] = afterVal;
        hasChanges = true;
      }
    }

    // Check for deleted keys (in before but not in after)
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        diff[key] = undefined;
        hasChanges = true;
      }
    }

    return hasChanges ? diff : null;
  }

  /**
   * Deep equality check for values.
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) return false;
      }
      return true;
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (!this.isEqual(aObj[key], bObj[key])) return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Removes stale captures that were never consumed.
   */
  private cleanupStaleCaptures(): void {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [id, capture] of this.pendingCaptures) {
      if (now - capture.capturedAt > this.MAX_CAPTURE_AGE_MS) {
        staleIds.push(id);
      }
    }

    if (staleIds.length > 0) {
      OpLog.warn('StateChangeCaptureService: Cleaning up stale captures', {
        count: staleIds.length,
        ids: staleIds,
      });
      for (const id of staleIds) {
        this.pendingCaptures.delete(id);
      }
    }
  }
}
