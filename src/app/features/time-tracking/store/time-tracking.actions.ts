/* eslint-disable @typescript-eslint/naming-convention */
import { createAction, createActionGroup, props } from '@ngrx/store';
import { WorkContextType } from '../../work-context/work-context.model';
import { TimeTrackingState, TTWorkContextData } from '../time-tracking.model';
import { Task } from '../../tasks/task.model';
import { PersistentActionMeta } from '../../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../../core/persistence/operation-log/operation.types';

// Standalone persistent action for updating work context data
export const updateWorkContextData = createAction(
  '[TimeTracking] Update Work Context Data',
  (actionProps: {
    ctx: { id: string; type: WorkContextType };
    date: string;
    updates: Partial<TTWorkContextData>;
  }) => ({
    ...actionProps,
    meta: {
      isPersistent: true,
      entityType: 'WORK_CONTEXT',
      entityId: actionProps.ctx.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const TimeTrackingActions = createActionGroup({
  source: 'TimeTracking',
  events: {
    'Add time spent': props<{
      task: Task;
      date: string;
      duration: number;
      isFromTrackingReminder: boolean;
    }>(),
    'Update whole State': props<{
      newState: TimeTrackingState;
    }>(),
  },
});

/**
 * Persistent action for syncing accumulated time spent to other clients.
 * Dispatched every 5 minutes during active tracking and when tracking stops.
 *
 * Local dispatch: Ignored by reducer (state already updated by addTimeSpent ticks)
 * Remote dispatch: Applied to update timeSpentOnDay and timeTracking state
 */
export const syncTimeSpent = createAction(
  '[TimeTracking] Sync time spent',
  (actionProps: { taskId: string; date: string; duration: number }) => ({
    ...actionProps,
    meta: {
      isPersistent: true,
      entityType: 'TASK',
      entityId: actionProps.taskId,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);
