import { createAction, props } from '@ngrx/store';

export const setFocusSessionDuration = createAction(
  '[FocusMode] Set Focus Session Duration',
  props<{ focusSessionDuration: number }>(),
);
export const setFocusSessionRunning = createAction(
  '[FocusMode] Load FocusModes Failure',
  props<{ isFocusSessionRunning: boolean }>(),
);

export const showFocusOverlay = createAction('[FocusMode] Show Focus Overlay');
export const hideFocusOverlay = createAction('[FocusMode] Hide Focus Overlay');
