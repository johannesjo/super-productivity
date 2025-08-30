import { createSelector, createFeatureSelector } from '@ngrx/store';
import { FOCUS_MODE_FEATURE_KEY } from './focus-mode.reducer';
import { FocusModeState, hasTimer } from '../focus-mode.model';
import { FocusModePage } from '../focus-mode.const';

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
  (phase) => phase.type === 'session',
);

export const selectIsSessionPaused = createSelector(
  selectPhase,
  (phase) => phase.type === 'session' && phase.timer.isPaused,
);

// Break selectors
export const selectIsBreakActive = createSelector(
  selectPhase,
  (phase) => phase.type === 'break',
);

export const selectIsLongBreak = createSelector(
  selectPhase,
  (phase) => phase.type === 'break' && phase.isLong,
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

// Backward compatibility selectors
export const selectIsFocusSessionRunning = selectIsSessionRunning;
export const selectIsFocusOverlayShown = selectIsOverlayShown;
export const selectFocusSessionTimeElapsed = selectTimeElapsed;
export const selectFocusSessionDuration = selectTimeDuration;
export const selectFocusModeIsBreak = selectIsBreakActive;
export const selectFocusModeBreakTimeElapsed = selectTimeElapsed;
export const selectFocusModeBreakDuration = selectTimeDuration;
export const selectFocusModeCurrentCycle = selectCurrentCycle;
export const selectFocusModeMode = selectMode;
export const selectFocusModeIsBreakLong = selectIsLongBreak;
export const selectLastSessionTotalDurationOrTimeElapsedFallback =
  selectLastSessionDuration;

// Map phase to old active page concept
export const selectFocusSessionActivePage = createSelector(
  selectPhaseType,
  selectIsBreakActive,
  (phaseType, isBreak): FocusModePage => {
    if (isBreak) return FocusModePage.Break;

    switch (phaseType) {
      case 'idle':
      case 'task-selection':
        return FocusModePage.TaskSelection;
      case 'duration-selection':
        return FocusModePage.DurationSelection;
      case 'preparation':
        return FocusModePage.Preparation;
      case 'session':
        return FocusModePage.Main;
      case 'session-done':
        return FocusModePage.SessionDone;
      case 'break-done':
        return FocusModePage.TaskSelection;
      default:
        return FocusModePage.TaskSelection;
    }
  },
);
