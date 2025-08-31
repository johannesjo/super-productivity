import { createReducer, on } from '@ngrx/store';
import * as a from './focus-mode.actions';
import {
  FocusModeMode,
  FocusModeState,
  FocusScreen,
  TimerState,
} from '../focus-mode.model';
import { LS } from '../../../core/persistence/storage-keys.const';

const DEFAULT_SESSION_DURATION = 25 * 60 * 1000;
const DEFAULT_BREAK_DURATION = 5 * 60 * 1000;

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
  currentScreen: FocusScreen.TaskSelection,
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
    currentScreen: FocusScreen.TaskSelection,
  })),

  on(a.selectFocusDuration, (state) => ({
    ...state,
    currentScreen: FocusScreen.DurationSelection,
  })),

  on(a.startFocusPreparation, (state) => ({
    ...state,
    currentScreen: FocusScreen.Preparation,
  })),

  on(a.goToMainScreen, (state) => ({
    ...state,
    currentScreen: FocusScreen.Main,
  })),

  on(a.startFocusSession, (state, { duration }) => {
    const timer = createWorkTimer(duration || DEFAULT_SESSION_DURATION);
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

  on(a.unPauseFocusSession, (state, { idleTime = 0 }) => {
    if (state.timer.purpose !== 'work') return state;

    return {
      ...state,
      timer: {
        ...state.timer,
        isRunning: true,
        startedAt: Date.now() - state.timer.elapsed + idleTime,
      },
    };
  }),

  on(a.focusSessionDone, (state) => {
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
    currentScreen: FocusScreen.TaskSelection,
    isOverlayShown: false,
  })),

  // Break handling
  on(a.startBreak, (state, { duration, isLongBreak }) => {
    const timer = createBreakTimer(
      duration || DEFAULT_BREAK_DURATION,
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
    currentScreen: FocusScreen.TaskSelection,
  })),

  // Timer updates - much simpler!
  on(a.tick, (state) => {
    if (!state.timer.isRunning || !state.timer.purpose) {
      return state;
    }

    const updatedTimer = updateTimer(state.timer);

    // Check if timer completed
    if (updatedTimer.duration > 0 && updatedTimer.elapsed >= updatedTimer.duration) {
      if (updatedTimer.purpose === 'work') {
        // Work session completed
        return {
          ...state,
          timer: createIdleTimer(),
          currentScreen: FocusScreen.SessionDone,
          lastCompletedDuration: updatedTimer.elapsed,
        };
      } else if (updatedTimer.purpose === 'break') {
        // Break completed
        return {
          ...state,
          timer: createIdleTimer(),
          currentScreen: FocusScreen.TaskSelection,
        };
      }
    }

    // Just update the timer
    return {
      ...state,
      timer: updatedTimer,
    };
  }),

  // Duration setting
  on(a.setFocusSessionDuration, (state, { focusSessionDuration }) => ({
    ...state,
    timer: {
      ...state.timer,
      duration: focusSessionDuration,
    },
  })),

  // Cycle management
  on(a.incrementCycle, (state) => ({
    ...state,
    currentCycle: state.currentCycle + 1,
  })),

  on(a.resetCycles, (state) => ({
    ...state,
    currentCycle: 1,
  })),
);

// For backward compatibility, export the old State interface name
export type State = FocusModeState;
