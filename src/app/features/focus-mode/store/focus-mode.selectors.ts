import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromFocusMode from './focus-mode.reducer';

export const selectFocusModeState = createFeatureSelector<fromFocusMode.State>(
  fromFocusMode.FOCUS_MODE_FEATURE_KEY,
);

export const selectIsFocusSessionRunning = createSelector(
  selectFocusModeState,
  (state) => state.isFocusSessionRunning,
);
export const selectFocusSessionDuration = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionDuration,
);
export const selectIsFocusOverlayShown = createSelector(
  selectFocusModeState,
  (state) => state.isFocusOverlayShown,
);

export const selectFocusSessionTimeToGo = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionTimeToGo,
);

export const selectFocusSessionActivePage = createSelector(
  selectFocusModeState,
  (state) => state.focusSessionActivePage,
);

export const selectFocusSessionProgress = createSelector(
  selectFocusModeState,
  (state) =>
    ((state.focusSessionDuration - state.focusSessionTimeToGo) * 100) /
    state.focusSessionDuration,
);
