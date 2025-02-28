import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FOCUS_MODE_FEATURE_KEY, State } from './focus-mode.reducer';

export const selectFocusModeState = createFeatureSelector<State>(FOCUS_MODE_FEATURE_KEY);

export const selectIsFocusSessionRunning = createSelector(
  selectFocusModeState,
  (state) => state.isFocusSessionRunning,
);
export const selectFocusModeMode = createSelector(
  selectFocusModeState,
  (state) => state.mode,
);
export const selectFocusSessionDuration = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionDuration,
);
export const selectIsFocusOverlayShown = createSelector(
  selectFocusModeState,
  (state) => state.isFocusOverlayShown,
);

export const selectFocusSessionTimeElapsed = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionTimeElapsed,
);

export const selectLastSessionTotalDurationOrTimeElapsedFallback = createSelector(
  selectFocusModeState,
  (state) => state.lastSessionTotalDuration || state.focusSessionTimeElapsed,
);

export const selectFocusSessionActivePage = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionActivePage,
);
