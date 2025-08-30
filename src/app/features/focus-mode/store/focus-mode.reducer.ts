import { createReducer, on } from '@ngrx/store';
import * as actions from './focus-mode.actions';
import { FocusModeState, TimerState, hasTimer } from '../focus-mode.model';
import { FocusModeMode } from '../focus-mode.const';
import { LS } from '../../../core/persistence/storage-keys.const';

const DEFAULT_SESSION_DURATION = 25 * 60 * 1000;
const DEFAULT_BREAK_DURATION = 5 * 60 * 1000;
const DEFAULT_LONG_BREAK_DURATION = 15 * 60 * 1000;

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

const focusModeModeFromLS = localStorage.getItem(LS.FOCUS_MODE_MODE);

export const initialState: FocusModeState = {
  phase: { type: 'idle' },
  mode: Object.values(FocusModeMode).includes(focusModeModeFromLS as any)
    ? (focusModeModeFromLS as FocusModeMode)
    : FocusModeMode.Countdown,
  isOverlayShown: false,
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
  on(actions.setMode, (state, { mode }) => ({
    ...state,
    mode,
  })),

  // Overlay control
  on(actions.showOverlay, (state) => ({
    ...state,
    isOverlayShown: true,
    phase:
      state.phase.type === 'idle' ? { type: 'task-selection' as const } : state.phase,
  })),

  on(actions.hideOverlay, (state) => ({
    ...state,
    isOverlayShown: false,
  })),

  // Phase transitions
  on(actions.selectTask, (state) => ({
    ...state,
    phase: { type: 'task-selection' as const },
  })),

  on(actions.selectDuration, (state) => ({
    ...state,
    phase: { type: 'duration-selection' as const },
  })),

  on(actions.startPreparation, (state) => ({
    ...state,
    phase: { type: 'preparation' as const },
  })),

  on(actions.startSession, (state, { duration }) => ({
    ...state,
    phase: {
      type: 'session' as const,
      timer: createTimer(duration || DEFAULT_SESSION_DURATION),
    },
  })),

  on(actions.pauseSession, (state) => {
    if (state.phase.type !== 'session') return state;

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

  on(actions.resumeSession, (state, { idleTime = 0 }) => {
    if (state.phase.type !== 'session') return state;

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

  on(actions.completeSession, (state) => {
    const duration = hasTimer(state.phase) ? state.phase.timer.elapsed : 0;

    return {
      ...state,
      phase: { type: 'session-done' as const, totalDuration: duration },
      lastSessionDuration: duration,
    };
  }),

  on(actions.cancelSession, (state) => ({
    ...state,
    phase: { type: 'task-selection' as const },
    isOverlayShown: false,
  })),

  // Break handling
  on(actions.startBreak, (state) => {
    // Break duration logic should be handled by effects using strategies
    const isLongBreak = state.currentCycle % 4 === 0;
    const duration = isLongBreak ? DEFAULT_LONG_BREAK_DURATION : DEFAULT_BREAK_DURATION;

    return {
      ...state,
      phase: {
        type: 'break' as const,
        timer: createTimer(duration),
        isLong: isLongBreak,
      },
    };
  }),

  on(actions.skipBreak, actions.completeBreak, (state) => ({
    ...state,
    phase: { type: 'task-selection' as const },
  })),

  // Timer updates
  on(actions.tick, (state) => {
    if (!hasTimer(state.phase)) return state;

    const updatedTimer = updateTimer(state.phase.timer);

    // Check if timer completed
    if (updatedTimer.duration > 0 && updatedTimer.elapsed >= updatedTimer.duration) {
      if (state.phase.type === 'session') {
        return {
          ...state,
          phase: { type: 'session-done' as const, totalDuration: updatedTimer.elapsed },
          lastSessionDuration: updatedTimer.elapsed,
        };
      } else if (state.phase.type === 'break') {
        return {
          ...state,
          phase: { type: 'break-done' as const },
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
  on(actions.nextCycle, (state) => ({
    ...state,
    currentCycle: state.currentCycle + 1,
  })),

  on(actions.resetCycles, (state) => ({
    ...state,
    currentCycle: 1,
  })),
);

// For backward compatibility, export the old State interface name
export type State = FocusModeState;
