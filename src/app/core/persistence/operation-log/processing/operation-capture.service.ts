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
import { SIMPLE_COUNTER_FEATURE_NAME } from '../../../../features/simple-counter/store/simple-counter.reducer';
import { TASK_REPEAT_CFG_FEATURE_NAME } from '../../../../features/task-repeat-cfg/store/task-repeat-cfg.selectors';
import { METRIC_FEATURE_NAME } from '../../../../features/metric/store/metric.reducer';
import { WORK_CONTEXT_FEATURE_NAME } from '../../../../features/work-context/store/work-context.selectors';
import { OpLog } from '../../../log';

/**
 * Maps EntityType to NgRx feature name in RootState.
 * Includes all entity types that are stored in NgRx feature states.
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
  SIMPLE_COUNTER: SIMPLE_COUNTER_FEATURE_NAME,
  TASK_REPEAT_CFG: TASK_REPEAT_CFG_FEATURE_NAME,
  METRIC: METRIC_FEATURE_NAME,
  WORK_CONTEXT: WORK_CONTEXT_FEATURE_NAME,
  // Note: TIME_TRACKING uses a different state shape (tag-keyed, not entity adapter)
  // and is handled specially in tag-shared.reducer.ts for tag deletion cleanup
};

/**
 * Queued entity changes waiting to be consumed by the effect.
 */
interface QueuedOperation {
  entityChanges: EntityChange[];
  queuedAt: number;
}

/**
 * Unified service for capturing state changes and queuing them for persistence.
 *
 * This service consolidates the functionality of the previous StateChangeCaptureService
 * and OperationQueueService into a single service.
 *
 * Flow:
 * 1. Meta-reducer calls `computeAndEnqueue()` with before/after states
 * 2. Service computes entity changes by diffing states and queues them
 * 3. Effect calls `dequeue()` to retrieve pre-computed changes for persistence
 *
 * This eliminates intermediate storage and simplifies the data flow.
 */
@Injectable({
  providedIn: 'root',
})
export class OperationCaptureService {
  /**
   * Queue of pending operations keyed by captureId.
   */
  private queue = new Map<string, QueuedOperation>();

  /**
   * Maximum age of queued operations before cleanup (5 seconds).
   * Handles cases where an action is captured but effect never runs.
   */
  private readonly MAX_QUEUE_AGE_MS = 5000;

  /**
   * Computes entity changes from before/after states and enqueues them.
   * Called synchronously by the operation-capture meta-reducer.
   *
   * @param captureId Unique identifier for this action's capture
   * @param action The persistent action that was processed
   * @param beforeState The root state before the action
   * @param afterState The root state after the action
   */
  computeAndEnqueue(
    captureId: string,
    action: PersistentAction,
    beforeState: RootState,
    afterState: RootState,
  ): void {
    // Clean up stale entries first
    this._cleanupStale();

    const entityChanges = this._computeEntityChanges(action, beforeState, afterState);

    this.queue.set(captureId, {
      entityChanges,
      queuedAt: Date.now(),
    });

    OpLog.verbose('OperationCaptureService: Computed and enqueued operation', {
      captureId,
      actionType: action.type,
      changeCount: entityChanges.length,
    });
  }

  /**
   * Dequeues entity changes for a given captureId.
   * Called by the effect to retrieve pre-computed changes.
   *
   * @param captureId Unique identifier for this action's capture
   * @returns Entity changes array, or empty array if not found
   */
  dequeue(captureId: string): EntityChange[] {
    const queued = this.queue.get(captureId);

    if (!queued) {
      OpLog.warn('OperationCaptureService: No queued operation found', { captureId });
      return [];
    }

    // Remove from queue
    this.queue.delete(captureId);

    OpLog.verbose('OperationCaptureService: Dequeued operation', {
      captureId,
      changeCount: queued.entityChanges.length,
    });

    return queued.entityChanges;
  }

  /**
   * Checks if an operation is queued (for testing/debugging).
   */
  has(captureId: string): boolean {
    return this.queue.has(captureId);
  }

  /**
   * Gets the current queue size (for monitoring).
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Clears all queued operations (for testing).
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Computes entity changes by diffing before and after states.
   * Uses reference equality to detect which feature states actually changed,
   * then only diffs those features.
   */
  private _computeEntityChanges(
    action: PersistentAction,
    beforeState: RootState,
    afterState: RootState,
  ): EntityChange[] {
    const changes: EntityChange[] = [];

    // Check all mapped entity types, but only diff those that actually changed
    for (const [entityType, featureName] of Object.entries(ENTITY_TYPE_TO_FEATURE)) {
      const beforeFeature = beforeState[featureName as keyof RootState];
      const afterFeature = afterState[featureName as keyof RootState];

      // Skip if feature state reference is identical (no change)
      if (beforeFeature === afterFeature) continue;
      if (!beforeFeature || !afterFeature) continue;

      // Handle entity adapter states (with entities object)
      if (
        (beforeFeature as any).entities !== undefined &&
        (afterFeature as any).entities !== undefined
      ) {
        const entityChanges = this._diffEntityState(
          entityType as EntityType,
          (beforeFeature as any).entities,
          (afterFeature as any).entities,
        );
        changes.push(...entityChanges);
      } else {
        // Handle singleton states (like globalConfig)
        const singletonChange = this._diffSingletonState(
          entityType as EntityType,
          beforeFeature as Record<string, unknown>,
          afterFeature as Record<string, unknown>,
        );
        if (singletonChange) {
          changes.push(singletonChange);
        }
      }
    }

    OpLog.verbose('OperationCaptureService: Computed entity changes', {
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
   * Diffs two entity adapter states and returns entity changes.
   */
  private _diffEntityState(
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
        const diff = this._computeObjectDiff(
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
  private _diffSingletonState(
    entityType: EntityType,
    beforeState: Record<string, unknown>,
    afterState: Record<string, unknown>,
  ): EntityChange | null {
    const diff = this._computeObjectDiff(beforeState, afterState);
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
  private _computeObjectDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const diff: Record<string, unknown> = {};
    let hasChanges = false;

    // Check all keys in after object
    for (const key of Object.keys(after)) {
      const beforeVal = before[key];
      const afterVal = after[key];

      if (!this._isEqual(beforeVal, afterVal)) {
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
  private _isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this._isEqual(a[i], b[i])) return false;
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
        if (!this._isEqual(aObj[key], bObj[key])) return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Removes stale entries that were never consumed.
   * This handles edge cases where an action is captured but the effect never runs.
   */
  private _cleanupStale(): void {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [captureId, queued] of this.queue) {
      if (now - queued.queuedAt > this.MAX_QUEUE_AGE_MS) {
        staleIds.push(captureId);
      }
    }

    if (staleIds.length > 0) {
      OpLog.warn('OperationCaptureService: Cleaning up stale queued operations', {
        count: staleIds.length,
        ids: staleIds,
      });
      for (const id of staleIds) {
        this.queue.delete(id);
      }
    }
  }
}
