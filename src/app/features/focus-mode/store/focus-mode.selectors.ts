import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FOCUS_MODE_FEATURE_KEY } from './focus-mode.reducer';
import { FocusModePhaseType, FocusModeState, hasTimer } from '../focus-mode.model'; // Base selectors

// Base selectors
export const selectFocusModeState =
  createFeatureSelector<FocusModeState>(FOCUS_MODE_FEATURE_KEY);

export const selectPhase = createSelector(selectFocusModeState, (state) => state.phase);

export const selectMode = createSelector(selectFocusModeState, (state) => state.mode);

export const selectIsOverlayShown = createSelector(
  selectFocusModeState,
  (state) => state.isOverlayShown,
);

export const selectCurrentCycle = createSelector(
  selectFocusModeState,
  (state) => state.currentCycle,
);

export const selectLastSessionDuration = createSelector(
  selectFocusModeState,
  (state) => state.lastSessionDuration,
);

// Session selectors
export const selectIsSessionRunning = createSelector(
  selectFocusModeState,
  (state) => state.isSessionRunning,
);

export const selectIsSessionPaused = createSelector(
  selectPhase,
  (phase) => phase.type === FocusModePhaseType.Session && phase.timer.isPaused,
);

// Break selectors
export const selectIsBreakActive = createSelector(
  selectPhase,
  (phase) => phase.type === FocusModePhaseType.Break,
);

export const selectIsLongBreak = createSelector(
  selectPhase,
  (phase) => phase.type === FocusModePhaseType.Break && phase.isLong,
);

// Timer selectors
export const selectTimeElapsed = createSelector(selectFocusModeState, (state) => {
  // Use sessionTimer if we're in an active session
  if (state.isSessionRunning && state.sessionTimer) {
    return state.sessionTimer.elapsed;
  }
  // Otherwise use phase timer if available
  return hasTimer(state.phase) ? state.phase.timer.elapsed : 0;
});

export const selectTimeDuration = createSelector(selectFocusModeState, (state) => {
  // Use sessionTimer if we're in an active session
  if (state.isSessionRunning && state.sessionTimer) {
    return state.sessionTimer.duration;
  }
  // Otherwise use phase timer if available
  return hasTimer(state.phase) ? state.phase.timer.duration : 0;
});

export const selectTimeRemaining = createSelector(
  selectTimeElapsed,
  selectTimeDuration,
  (elapsed, duration) => Math.max(0, duration - elapsed),
);

export const selectProgress = createSelector(
  selectTimeElapsed,
  selectTimeDuration,
  (elapsed, duration) => (duration > 0 ? (elapsed / duration) * 100 : 0),
);

export const selectIsRunning = createSelector(selectFocusModeState, (state) => {
  // Check sessionTimer if in active session
  if (state.isSessionRunning && state.sessionTimer) {
    return !state.sessionTimer.isPaused;
  }
  // Otherwise check phase timer
  return hasTimer(state.phase) && !state.phase.timer.isPaused;
});
