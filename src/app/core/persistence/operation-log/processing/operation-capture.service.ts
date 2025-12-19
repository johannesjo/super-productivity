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
  // Note: TIME_TRACKING uses action-payload capture (see _captureTimeTrackingFromAction)
  // instead of state diffing for efficiency with its nested structure
};

/**
 * Captures state changes and queues them for persistence using a simple FIFO queue.
 *
 * Flow:
 * 1. Meta-reducer calls `computeAndEnqueue()` with before/after states
 * 2. Service computes entity changes by diffing states and pushes to queue
 * 3. Effect calls `dequeue()` to retrieve changes for persistence (FIFO order)
 *
 * The FIFO queue works because:
 * - NgRx reducers process actions sequentially
 * - Effect uses concatMap for sequential processing
 * - Order is preserved between enqueue and dequeue
 */
@Injectable({
  providedIn: 'root',
})
export class OperationCaptureService {
  /**
   * Maximum queue size to prevent unbounded memory growth.
   * If effects fail to dequeue, we cap the queue and log errors.
   */
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly QUEUE_WARNING_THRESHOLD = 100;

  /**
   * FIFO queue of pending entity changes.
   */
  private queue: EntityChange[][] = [];

  /**
   * Tracks if we've already warned about queue overflow to avoid log spam.
   */
  private hasWarnedAboutQueueSize = false;

  /**
   * Computes entity changes from before/after states and enqueues them.
   * Called synchronously by the operation-capture meta-reducer.
   */
  computeAndEnqueue(
    action: PersistentAction,
    beforeState: RootState,
    afterState: RootState,
  ): void {
    const entityChanges = this._computeEntityChanges(action, beforeState, afterState);

    // Warn if queue is growing large (indicates potential processing issue)
    if (
      this.queue.length >= this.QUEUE_WARNING_THRESHOLD &&
      !this.hasWarnedAboutQueueSize
    ) {
      OpLog.warn(
        `OperationCaptureService: Queue size (${this.queue.length}) exceeds warning threshold ` +
          `(${this.QUEUE_WARNING_THRESHOLD}). Effects may not be processing operations.`,
      );
      this.hasWarnedAboutQueueSize = true;
    }

    // Cap queue size to prevent unbounded memory growth
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      OpLog.err(
        `OperationCaptureService: Queue full (${this.MAX_QUEUE_SIZE}). ` +
          `Dropping oldest operation to make room. This indicates a serious processing issue!`,
      );
      this.queue.shift(); // Drop oldest to make room
    }

    this.queue.push(entityChanges);

    OpLog.verbose('OperationCaptureService: Computed and enqueued operation', {
      actionType: action.type,
      changeCount: entityChanges.length,
      queueSize: this.queue.length,
    });
  }

  /**
   * Dequeues the next batch of entity changes (FIFO).
   * Called by the effect to retrieve pre-computed changes for persistence.
   */
  dequeue(): EntityChange[] {
    const entityChanges = this.queue.shift();

    if (entityChanges === undefined) {
      OpLog.warn('OperationCaptureService: No queued operation found');
      return [];
    }

    // Reset warning flag when queue drains below threshold so we can warn again if it fills up
    if (
      this.queue.length < this.QUEUE_WARNING_THRESHOLD &&
      this.hasWarnedAboutQueueSize
    ) {
      this.hasWarnedAboutQueueSize = false;
    }

    OpLog.verbose('OperationCaptureService: Dequeued operation', {
      changeCount: entityChanges.length,
      queueSize: this.queue.length,
    });

    return entityChanges;
  }

  /**
   * Gets the current queue size (for monitoring).
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clears all queued operations (for testing).
   */
  clear(): void {
    this.queue = [];
    this.hasWarnedAboutQueueSize = false;
  }

  /**
   * Computes entity changes by diffing before and after states.
   * Uses reference equality to detect which feature states actually changed,
   * then only diffs those features.
   *
   * TIME_TRACKING uses action-payload capture instead of state diffing for efficiency.
   */
  private _computeEntityChanges(
    action: PersistentAction,
    beforeState: RootState,
    afterState: RootState,
  ): EntityChange[] {
    // TIME_TRACKING: Use action payload directly (granular, efficient)
    // This avoids syncing the entire nested state on every update
    if (action.meta.entityType === 'TIME_TRACKING') {
      return this._captureTimeTrackingFromAction(action);
    }

    // TASK time sync (syncTimeSpent): Use action-payload capture.
    // The reducer is a no-op locally (state already updated by addTimeSpent ticks),
    // so state diff would be empty. Check payload shape (same check as validation uses).
    if (
      action.meta.entityType === 'TASK' &&
      'taskId' in action &&
      'date' in action &&
      'duration' in action
    ) {
      return this._captureTaskTimeSyncFromAction(action);
    }

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
    // PERF: Reference equality check is critical here. NgRx uses immutable updates,
    // so unchanged entities keep the same reference. Without this check, we'd run
    // expensive deep diffs (_computeObjectDiff → _isEqual) on every entity in state.
    // With 100+ tasks, that's O(n * m) comparisons where m = properties per entity.
    // This single check reduces it to O(changed * m) where changed is typically 1-5.
    for (const id of afterIds) {
      if (beforeIds.has(id)) {
        if (beforeEntities[id] === afterEntities[id]) continue;

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
   * Captures TIME_TRACKING changes from action payload (not state diff).
   * This is more efficient than state diffing for the nested TIME_TRACKING structure.
   *
   * Supports both syncTimeTracking and updateWorkContextData actions.
   */
  private _captureTimeTrackingFromAction(action: PersistentAction): EntityChange[] {
    // syncTimeTracking action: { contextType, contextId, date, data }
    if (
      'contextType' in action &&
      'contextId' in action &&
      'date' in action &&
      'data' in action
    ) {
      const { contextType, contextId, date, data } = action as unknown as {
        contextType: 'TAG' | 'PROJECT';
        contextId: string;
        date: string;
        data: unknown;
      };
      return [
        {
          entityType: 'TIME_TRACKING',
          entityId: `${contextType}:${contextId}:${date}`,
          opType: OpType.Update,
          changes: { contextType, contextId, date, data },
        },
      ];
    }

    // updateWorkContextData action: { ctx: { id, type }, date, updates }
    if ('ctx' in action && 'date' in action && 'updates' in action) {
      const { ctx, date, updates } = action as unknown as {
        ctx: { id: string; type: string };
        date: string;
        updates: unknown;
      };
      return [
        {
          entityType: 'TIME_TRACKING',
          entityId: `${ctx.type}:${ctx.id}:${date}`,
          opType: OpType.Update,
          changes: { ctx, date, updates },
        },
      ];
    }

    OpLog.warn('OperationCaptureService: Unknown TIME_TRACKING action format', {
      actionType: action.type,
    });
    return [];
  }

  /**
   * Captures TASK time sync changes from syncTimeSpent action payload.
   * The local reducer is a no-op (state already updated by addTimeSpent ticks),
   * so we capture from the action payload instead of state diffing.
   */
  private _captureTaskTimeSyncFromAction(action: PersistentAction): EntityChange[] {
    const { taskId, date, duration } = action as unknown as {
      taskId: string;
      date: string;
      duration: number;
    };

    return [
      {
        entityType: 'TASK',
        entityId: taskId,
        opType: OpType.Update,
        changes: { taskId, date, duration },
      },
    ];
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
   * Maximum depth for _isEqual recursion to prevent stack overflow on deeply nested structures.
   */
  private readonly MAX_EQUAL_DEPTH = 50;

  /**
   * Deep equality check for values with circular reference and depth protection.
   *
   * @param a First value to compare
   * @param b Second value to compare
   * @param seen WeakSet to track visited objects (circular reference protection)
   * @param depth Current recursion depth (deep nesting protection)
   */
  private _isEqual(
    a: unknown,
    b: unknown,
    seen: WeakSet<object> = new WeakSet(),
    depth: number = 0,
  ): boolean {
    // Depth limit protection
    if (depth > this.MAX_EQUAL_DEPTH) {
      OpLog.warn('OperationCaptureService: _isEqual exceeded max depth, returning false');
      return false;
    }

    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    // For objects/arrays, check for circular references
    if (typeof a === 'object' && typeof b === 'object') {
      if (seen.has(a as object) || seen.has(b as object)) {
        OpLog.warn(
          'OperationCaptureService: _isEqual detected circular reference, returning false',
        );
        return false;
      }
      seen.add(a as object);
      seen.add(b as object);

      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!this._isEqual(a[i], b[i], seen, depth + 1)) return false;
        }
        return true;
      }

      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (!this._isEqual(aObj[key], bObj[key], seen, depth + 1)) return false;
      }
      return true;
    }

    return false;
  }
}
