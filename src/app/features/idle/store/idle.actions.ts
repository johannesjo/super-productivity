import { createAction, props } from '@ngrx/store';
import { TaskCopy } from '../../tasks/task.model';

export const triggerIdle = createAction(
  '[Idle] Trigger Idle',
  props<{ idleTime: number }>(),
);
export const resetIdle = createAction('[Idle] Reset');
export const openIdleDialog = createAction('[Idle] Open dialog');
export const setIdleTime = createAction(
  '[Idle] Set idle time',
  props<{ idleTime: number }>(),
);
export const idleDialogResult = createAction(
  '[Idle] dialog result',
  props<{
    timeSpent: number;
    selectedTaskOrTitle: TaskCopy | string;
    isResetBreakTimer: boolean;
    isTrackAsBreak: boolean;
  }>(),
);

// TODO better place would be the take a break module, if we ever add a store there
export const triggerResetBreakTimer = createAction('[Idle] Reset break timer');
