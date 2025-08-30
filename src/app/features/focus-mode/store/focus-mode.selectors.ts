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
  selectPhase,
  (phase) => phase.type === FocusModePhaseType.Session,
);

// Select if there's an active session context (session running OR task selection during active session)
export const selectIsSessionContextActive = createSelector(
  selectPhase,
  selectLastSessionDuration,
  (phase, lastSessionDuration) => {
    // Session is actively running
    if (phase.type === FocusModePhaseType.Session) {
      return true;
    }

    // Task selection during an active session (session was paused/completed but user is selecting next task)
    if (phase.type === FocusModePhaseType.TaskSelection && lastSessionDuration > 0) {
      return true;
    }

    return false;
  },
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
