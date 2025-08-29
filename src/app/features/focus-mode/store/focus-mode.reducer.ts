import { createReducer, on } from '@ngrx/store';
import {
  cancelFocusSession,
  focusSessionDone,
  hideFocusOverlay,
  pauseFocusSession,
  setFocusModeMode,
  setFocusSessionActivePage,
  setFocusSessionDuration,
  setFocusSessionTimeElapsed,
  showFocusOverlay,
  startFocusSession,
  unPauseFocusSession,
  startBreak,
  setBreakTimeElapsed,
  skipBreak,
  completeBreak,
  incrementCycle,
  resetCycles,
} from './focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { LS } from '../../../core/persistence/storage-keys.const';

const DEFAULT_FOCUS_SESSION_DURATION = 25 * 60 * 1000;
// const USE_REMAINING_SESSION_TIME_THRESHOLD = 60 * 1000;

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

export interface State {
  isFocusOverlayShown: boolean;
  isFocusSessionRunning: boolean;
  focusSessionDuration: number;
  focusSessionTimeElapsed: number;
  lastSessionTotalDuration: number;
  focusSessionActivePage: FocusModePage;
  mode: FocusModeMode;
  // Pomodoro break-related properties
  isBreak: boolean;
  breakTimeElapsed: number;
  breakDuration: number;
  isBreakLong: boolean;
  currentCycle: number;
}

const focusModeModeFromLS = localStorage.getItem(LS.FOCUS_MODE_MODE);

export const initialState: State = {
  isFocusOverlayShown: false,
  isFocusSessionRunning: false,
  focusSessionDuration: DEFAULT_FOCUS_SESSION_DURATION,
  focusSessionTimeElapsed: 0,
  lastSessionTotalDuration: 0,
  focusSessionActivePage: FocusModePage.TaskSelection,
  mode: Object.values(FocusModeMode).includes(focusModeModeFromLS as any)
    ? (focusModeModeFromLS as any)
    : FocusModeMode.Flowtime,
  // Pomodoro break-related initial values
  isBreak: false,
  breakTimeElapsed: 0,
  breakDuration: 5 * 60 * 1000, // 5 minutes default
  isBreakLong: false,
  currentCycle: 1,
};

export const focusModeReducer = createReducer<State>(
  initialState,

  on(setFocusSessionActivePage, (state, { focusActivePage: focusSessionActivePage }) => ({
    ...state,
    focusSessionActivePage,
  })),
  on(setFocusModeMode, (state, { mode }) => ({
    ...state,
    mode,
  })),
  on(setFocusSessionDuration, (state, { focusSessionDuration }) => ({
    ...state,
    focusSessionDuration,
  })),

  on(setFocusSessionTimeElapsed, (state, { focusSessionTimeElapsed }) => ({
    ...state,
    focusSessionTimeElapsed,
  })),

  on(startFocusSession, (state) => ({
    ...state,
    isFocusSessionRunning: true,
    focusSessionActivePage: FocusModePage.Main,
    lastSessionTotalDuration: 0,
    // NOTE: not resetting since, we might want to continue
    // focusSessionTimeElapsed: 0,
    focusSessionDuration:
      state.focusSessionDuration > 0
        ? state.focusSessionDuration
        : DEFAULT_FOCUS_SESSION_DURATION,
  })),

  on(focusSessionDone, (state, { isResetPlannedSessionDuration }) => {
    return {
      ...state,
      isFocusSessionRunning: false,
      isFocusOverlayShown: true,
      ...(isResetPlannedSessionDuration
        ? {
            focusSessionDuration: DEFAULT_FOCUS_SESSION_DURATION,
            lastSessionTotalDuration: state.focusSessionTimeElapsed,
            focusSessionTimeElapsed: 0,
          }
        : {}),
      focusSessionActivePage: FocusModePage.SessionDone,
    };
  }),

  on(pauseFocusSession, (state) => ({
    ...state,
    isFocusSessionRunning: false,
  })),

  on(unPauseFocusSession, (state, { idleTimeToAdd = 0 }) => ({
    ...state,
    isFocusSessionRunning: true,
    // NOTE: this is adjusted in the effect via session time
    // focusSessionDuration: state.focusSessionDuration,
  })),

  on(showFocusOverlay, (state) => ({
    ...state,
    isFocusOverlayShown: true,
  })),
  on(hideFocusOverlay, (state) => ({
    ...state,
    isFocusOverlayShown: false,
    focusSessionActivePage:
      state.focusSessionActivePage === FocusModePage.SessionDone
        ? FocusModePage.TaskSelection
        : state.focusSessionActivePage,
  })),
  on(cancelFocusSession, (state) => ({
    ...state,
    isFocusOverlayShown: false,
    isFocusSessionRunning: false,
    focusSessionTimeElapsed: 0,
    focusSessionDuration: DEFAULT_FOCUS_SESSION_DURATION,
  })),

  // Break-related reducers
  on(startBreak, (state, { isLongBreak, breakDuration }) => ({
    ...state,
    isBreak: true,
    breakTimeElapsed: 0,
    breakDuration,
    isBreakLong: isLongBreak,
    focusSessionActivePage: FocusModePage.Break,
  })),

  on(setBreakTimeElapsed, (state, { breakTimeElapsed }) => ({
    ...state,
    breakTimeElapsed,
  })),

  on(skipBreak, completeBreak, (state) => ({
    ...state,
    isBreak: false,
    breakTimeElapsed: 0,
    focusSessionActivePage: FocusModePage.Main,
    focusSessionTimeElapsed: 0, // Reset for new pomodoro session
  })),

  on(incrementCycle, (state) => ({
    ...state,
    currentCycle: state.currentCycle + 1,
  })),

  on(resetCycles, (state) => ({
    ...state,
    currentCycle: 1,
  })),
);
