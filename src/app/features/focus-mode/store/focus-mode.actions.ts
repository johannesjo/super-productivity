import { createAction, props } from '@ngrx/store';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';

export const setFocusSessionActivePage = createAction(
  '[FocusMode] Set Focus Active Page',
  props<{ focusActivePage: FocusModePage }>(),
);
export const setFocusModeMode = createAction(
  '[FocusMode] Set Focus Mode Mode',
  props<{ mode: FocusModeMode }>(),
);

export const setFocusSessionDuration = createAction(
  '[FocusMode] Set Focus Session Duration',
  props<{ focusSessionDuration: number }>(),
);

export const setFocusSessionTimeElapsed = createAction(
  '[FocusMode] Set focus session elapsed time',
  props<{ focusSessionTimeElapsed: number }>(),
);
export const startFocusSession = createAction('[FocusMode] Start focus session');
export const cancelFocusSession = createAction('[FocusMode] Cancel Focus Session');
export const pauseFocusSession = createAction('[FocusMode] Pause Focus Session');
export const unPauseFocusSession = createAction(
  '[FocusMode] UnPause Focus Session',
  props<{ idleTimeToAdd?: number }>(),
);

export const focusSessionDone = createAction(
  '[FocusMode] Focus session done',
  props<{ isResetPlannedSessionDuration?: boolean }>(),
);

export const showFocusOverlay = createAction('[FocusMode] Show Focus Overlay');
export const hideFocusOverlay = createAction('[FocusMode] Hide Focus Overlay');
