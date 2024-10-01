import { createAction, props } from '@ngrx/store';
import { SimpleCounter } from '../../simple-counter/simple-counter.model';
import { IdleTrackItem, SimpleCounterIdleBtn } from '../dialog-idle/dialog-idle.model';

export const triggerIdle = createAction(
  '[Idle] Trigger Idle',
  props<{ idleTime: number }>(),
);
export const resetIdle = createAction('[Idle] Reset');

export const openIdleDialog = createAction(
  '[Idle] Open dialog',
  props<{
    lastCurrentTaskId: string | null;
    enabledSimpleStopWatchCounters: SimpleCounter[];
  }>(),
);

export const setIdleTime = createAction(
  '[Idle] Set idle time',
  props<{ idleTime: number }>(),
);

export const idleDialogResult = createAction(
  '[Idle] Dialog result',
  props<{
    idleTime: number;
    trackItems: IdleTrackItem[];
    simpleCounterToggleBtnsWhenNoTrackItems?: SimpleCounterIdleBtn[];
  }>(),
);

// TODO better place would be the take a break module, if we ever add a store there
export const triggerResetBreakTimer = createAction('[Idle] Reset break timer');
