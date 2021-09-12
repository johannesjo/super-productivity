import { createAction, props } from '@ngrx/store';

export const triggerIdle = createAction(
  '[Idle] Trigger Idle',
  props<{ idleTime: number }>(),
);
export const resetIdle = createAction('[Idle] Reset');
export const setIdleTime = createAction(
  '[Idle] Set idle time',
  props<{ idleTime: number }>(),
);
