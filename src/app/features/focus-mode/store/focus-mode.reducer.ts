import { createReducer, on } from '@ngrx/store';
import * as a from './focus-mode.actions';
import {
  FocusModeState,
  TimerState,
  hasTimer,
  FocusModePhaseType,
  FocusModeMode,
} from '../focus-mode.model';
import { LS } from '../../../core/persistence/storage-keys.const';

const DEFAULT_SESSION_DURATION = 25 * 60 * 1000;
const DEFAULT_BREAK_DURATION = 5 * 60 * 1000;
const DEFAULT_LONG_BREAK_DURATION = 15 * 60 * 1000;

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

const focusModeModeFromLS = localStorage.getItem(LS.FOCUS_MODE_MODE);

export const initialState: FocusModeState = {
  phase: { type: FocusModePhaseType.Idle },
  mode: Object.values(FocusModeMode).includes(focusModeModeFromLS as any)
    ? (focusModeModeFromLS as FocusModeMode)
    : FocusModeMode.Countdown,
  isOverlayShown: false,
  isSessionRunning: false,
  currentCycle: 1,
  lastSessionDuration: 0,
};

const createTimer = (duration: number): TimerState => {
  return {
    startedAt: Date.now(),
    elapsed: 0,
    duration,
    isPaused: false,
  };
};

const updateTimer = (timer: TimerState): TimerState => {
  if (timer.isPaused || !timer.startedAt) {
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
    phase:
      state.phase.type === FocusModePhaseType.Idle
        ? { type: FocusModePhaseType.TaskSelection as const }
        : state.phase,
  })),

  on(a.hideFocusOverlay, (state) => ({
    ...state,
    isOverlayShown: false,
  })),

  // Phase transitions
  on(a.selectFocusTask, (state) => ({
    ...state,
    phase: { type: FocusModePhaseType.TaskSelection as const },
    // Keep isSessionRunning unchanged - if we're in an active session, it continues
  })),

  on(a.selectFocusDuration, (state) => ({
    ...state,
    phase: { type: FocusModePhaseType.DurationSelection as const },
  })),

  on(a.startFocusPreparation, (state) => ({
    ...state,
    phase: { type: FocusModePhaseType.Preparation as const },
  })),

  on(a.startFocusSession, (state, { duration }) => ({
    ...state,
    isSessionRunning: true,
    phase: {
      type: FocusModePhaseType.Session as const,
      timer: createTimer(duration || DEFAULT_SESSION_DURATION),
    },
  })),

  on(a.pauseFocusSession, (state) => {
    if (state.phase.type !== FocusModePhaseType.Session) return state;

    return {
      ...state,
      phase: {
        ...state.phase,
        timer: {
          ...state.phase.timer,
          isPaused: true,
          elapsed: state.phase.timer.elapsed,
        },
      },
    };
  }),

  on(a.unPauseFocusSession, (state, { idleTime = 0 }) => {
    if (state.phase.type !== FocusModePhaseType.Session) return state;

    return {
      ...state,
      phase: {
        ...state.phase,
        timer: {
          ...state.phase.timer,
          isPaused: false,
          startedAt: Date.now() - state.phase.timer.elapsed + idleTime,
        },
      },
    };
  }),

  on(a.focusSessionDone, (state) => {
    const duration = hasTimer(state.phase) ? state.phase.timer.elapsed : 0;

    return {
      ...state,
      isSessionRunning: false,
      phase: { type: FocusModePhaseType.SessionDone as const, totalDuration: duration },
      lastSessionDuration: duration,
    };
  }),

  on(a.cancelFocusSession, (state) => ({
    ...state,
    isSessionRunning: false,
    phase: { type: FocusModePhaseType.TaskSelection as const },
    isOverlayShown: false,
  })),

  // Break handling
  on(a.startBreak, (state) => {
    // Break duration logic should be handled by effects using strategies
    const isLongBreak = state.currentCycle % 4 === 0;
    const duration = isLongBreak ? DEFAULT_LONG_BREAK_DURATION : DEFAULT_BREAK_DURATION;

    return {
      ...state,
      isSessionRunning: false,
      phase: {
        type: FocusModePhaseType.Break as const,
        timer: createTimer(duration),
        isLong: isLongBreak,
      },
    };
  }),

  on(a.skipBreak, a.completeBreak, (state) => ({
    ...state,
    phase: { type: FocusModePhaseType.TaskSelection as const },
  })),

  // Timer updates
  on(a.tick, (state) => {
    if (!hasTimer(state.phase)) return state;

    const updatedTimer = updateTimer(state.phase.timer);

    // Check if timer completed
    if (updatedTimer.duration > 0 && updatedTimer.elapsed >= updatedTimer.duration) {
      if (state.phase.type === FocusModePhaseType.Session) {
        return {
          ...state,
          isSessionRunning: false,
          phase: {
            type: FocusModePhaseType.SessionDone as const,
            totalDuration: updatedTimer.elapsed,
          },
          lastSessionDuration: updatedTimer.elapsed,
        };
      } else if (state.phase.type === FocusModePhaseType.Break) {
        return {
          ...state,
          phase: { type: FocusModePhaseType.BreakDone as const },
        };
      }
    }

    return {
      ...state,
      phase: {
        ...state.phase,
        timer: updatedTimer,
      } as any,
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
);

// For backward compatibility, export the old State interface name
export type State = FocusModeState;
