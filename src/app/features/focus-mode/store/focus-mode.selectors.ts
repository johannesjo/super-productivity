import { createSelector, createFeatureSelector } from '@ngrx/store';
import { FOCUS_MODE_FEATURE_KEY } from './focus-mode.reducer';
import { FocusModeState, hasTimer, FocusModePhaseType } from '../focus-mode.model';

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

// Phase type
export const selectPhaseType = createSelector(selectPhase, (phase) => phase.type);

// Session selectors
export const selectIsSessionRunning = createSelector(
  selectPhase,
  (phase) => phase.type === FocusModePhaseType.Session,
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
export const selectTimeElapsed = createSelector(selectPhase, (phase) =>
  hasTimer(phase) ? phase.timer.elapsed : 0,
);

export const selectTimeDuration = createSelector(selectPhase, (phase) =>
  hasTimer(phase) ? phase.timer.duration : 0,
);

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

export const selectIsRunning = createSelector(
  selectPhase,
  (phase) => hasTimer(phase) && !phase.timer.isPaused,
);
