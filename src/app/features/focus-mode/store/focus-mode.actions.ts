import { createAction, props } from '@ngrx/store';
import { FocusModePage } from '../focus-mode.const';

export const setFocusSessionActivePage = createAction(
  '[FocusMode] Set Focus Active Page',
  props<{ focusActivePage: FocusModePage }>(),
);

export const setFocusSessionDuration = createAction(
  '[FocusMode] Set Focus Session Duration',
  props<{ focusSessionDuration: number }>(),
);
export const setFocusSessionRunning = createAction(
  '[FocusMode] Load FocusModes Failure',
  props<{ isFocusSessionRunning: boolean }>(),
);

export const setFocusSessionTimeToGo = createAction(
  '[FocusMode] Set focus session elapsed time',
  props<{ focusSessionTimeToGo: number }>(),
);
export const startFocusSession = createAction('[FocusMode] Start focus session');
export const focusSessionDone = createAction('[FocusMode] Focus session done');

export const showFocusOverlay = createAction('[FocusMode] Show Focus Overlay');
export const hideFocusOverlay = createAction('[FocusMode] Hide Focus Overlay');
