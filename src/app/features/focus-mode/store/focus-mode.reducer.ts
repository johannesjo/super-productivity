import { createReducer, on } from '@ngrx/store';
import * as a from './focus-mode.actions';
import {
  FocusModeMode,
  FocusModeState,
  FocusScreen,
  TimerState,
  FOCUS_MODE_DEFAULTS,
} from '../focus-mode.model';
import { LS } from '../../../core/persistence/storage-keys.const';

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

const focusModeModeFromLS = localStorage.getItem(LS.FOCUS_MODE_MODE);

const createIdleTimer = (): TimerState => ({
  isRunning: false,
  startedAt: null,
  elapsed: 0,
  duration: 0,
  purpose: null,
});

export const initialState: FocusModeState = {
  timer: createIdleTimer(),
  currentScreen: FocusScreen.Main,
  isOverlayShown: false,
  mode: Object.values(FocusModeMode).includes(focusModeModeFromLS as any)
    ? (focusModeModeFromLS as FocusModeMode)
    : FocusModeMode.Countdown,
  currentCycle: 1,
  lastCompletedDuration: 0,
};

const createWorkTimer = (duration: number): TimerState => ({
  isRunning: true,
  startedAt: Date.now(),
  elapsed: 0,
  duration,
  purpose: 'work',
});

const createBreakTimer = (duration: number, isLong = false): TimerState => ({
  isRunning: true,
  startedAt: Date.now(),
  elapsed: 0,
  duration,
  purpose: 'break',
  isLongBreak: isLong,
});

const updateTimer = (timer: TimerState): TimerState => {
  if (!timer.isRunning || !timer.startedAt) {
    return timer;
  }

  const now = Date.now();
  const elapsed = now - timer.startedAt;
  return { ...timer, elapsed };
};

export const focusModeReducer = createReducer(
  initialState,

  // Mode changes
  on(a.setFocusModeMode, (state, { mode }) => ({
    ...state,
    mode,
  })),

  // Overlay control
  on(a.showFocusOverlay, (state) => ({
    ...state,
    isOverlayShown: true,
  })),

  on(a.hideFocusOverlay, (state) => ({
    ...state,
    isOverlayShown: false,
  })),

  // Screen navigation
  on(a.selectFocusTask, (state) => ({
    ...state,
    currentScreen: FocusScreen.Main,
  })),

  on(a.selectFocusDuration, (state) => ({
    ...state,
    currentScreen: FocusScreen.DurationSelection,
  })),

  on(a.startFocusPreparation, (state) => ({
    ...state,
    currentScreen: FocusScreen.Preparation,
  })),

  on(a.navigateToMainScreen, (state) => ({
    ...state,
    currentScreen: FocusScreen.Main,
  })),

  on(a.startFocusSession, (state, { duration }) => {
    // important to use 0 for flowtime
    const timer = createWorkTimer(duration ?? FOCUS_MODE_DEFAULTS.SESSION_DURATION);
    return {
      ...state,
      timer,
      currentScreen: FocusScreen.Main,
    };
  }),

  on(a.pauseFocusSession, (state) => {
    if (state.timer.purpose !== 'work') return state;

    return {
      ...state,
      timer: {
        ...state.timer,
        isRunning: false,
      },
    };
  }),

  on(a.unPauseFocusSession, (state) => {
    if (state.timer.purpose !== 'work') return state;

    return {
      ...state,
      timer: {
        ...state.timer,
        isRunning: true,
        startedAt: Date.now() - state.timer.elapsed,
      },
    };
  }),

  on(a.completeFocusSession, (state, { isManual }) => {
    const duration = state.timer.elapsed;

    return {
      ...state,
      timer: createIdleTimer(),
      currentScreen: FocusScreen.SessionDone,
      lastCompletedDuration: duration,
    };
  }),

  on(a.cancelFocusSession, (state) => ({
    ...state,
    timer: createIdleTimer(),
    currentScreen: FocusScreen.Main,
    isOverlayShown: false,
  })),

  // Break handling
  on(a.startBreak, (state, { duration, isLongBreak }) => {
    const timer = createBreakTimer(
      duration || FOCUS_MODE_DEFAULTS.SHORT_BREAK_DURATION,
      isLongBreak || false,
    );

    return {
      ...state,
      timer,
      currentScreen: FocusScreen.Break,
    };
  }),

  on(a.skipBreak, a.completeBreak, (state) => ({
    ...state,
    timer: createIdleTimer(),
    currentScreen: FocusScreen.Main,
  })),

  // Timer updates - much simpler!
  on(a.tick, (state) => {
    if (!state.timer.isRunning || !state.timer.purpose) {
      return state;
    }

    const updatedTimer = updateTimer(state.timer);

    // Check if timer completed - mark for completion but let effects handle the flow
    if (updatedTimer.duration > 0 && updatedTimer.elapsed >= updatedTimer.duration) {
      if (updatedTimer.purpose === 'work') {
        // Work session completed - stop timer and mark duration, but don't change screen yet
        return {
          ...state,
          timer: { ...updatedTimer, isRunning: false }, // Stop the timer but preserve state
          lastCompletedDuration: updatedTimer.elapsed,
        };
      } else if (updatedTimer.purpose === 'break') {
        // Break completed - stop timer but stay on break screen for user confirmation
        return {
          ...state,
          timer: { ...updatedTimer, isRunning: false },
        };
      }
    }

    // Just update the timer
    return {
      ...state,
      timer: updatedTimer,
    };
  }),

  // Duration setting - don't set duration for Flowtime sessions
  on(a.setFocusSessionDuration, (state, { focusSessionDuration }) => {
    // Prevent setting duration for Flowtime mode to ensure it runs forever
    if (state.mode === FocusModeMode.Flowtime) {
      return state;
    }
    return {
      ...state,
      timer: {
        ...state.timer,
        duration: focusSessionDuration,
      },
    };
  }),

  // Cycle management
  on(a.incrementCycle, (state) => ({
    ...state,
    currentCycle: state.currentCycle + 1,
  })),

  on(a.resetCycles, (state) => ({
    ...state,
    currentCycle: 1,
  })),

  // Adjust remaining time by modifying elapsed
  on(a.adjustRemainingTime, (state, { amountMs }) => {
    if (!state.timer.isRunning || state.timer.purpose !== 'work') {
      return state;
    }

    // Negative amount adds time (reduces elapsed), positive removes time (increases elapsed)
    const newElapsed = state.timer.elapsed - amountMs;

    // Ensure elapsed is never negative
    const clampedElapsed = Math.max(0, newElapsed);

    // For countdown modes, ensure elapsed doesn't exceed duration
    const finalElapsed =
      state.timer.duration > 0
        ? Math.min(clampedElapsed, state.timer.duration)
        : clampedElapsed;

    // Adjust startedAt to maintain the correct elapsed time
    const newStartedAt = state.timer.startedAt ? Date.now() - finalElapsed : Date.now();

    return {
      ...state,
      timer: {
        ...state.timer,
        elapsed: finalElapsed,
        startedAt: newStartedAt,
      },
    };
  }),
);

// For backward compatibility, export the old State interface name
export type State = FocusModeState;
