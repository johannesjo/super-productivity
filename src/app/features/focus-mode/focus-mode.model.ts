import { FocusModeMode } from './focus-mode.const';

// Unified timer state
export interface TimerState {
  startedAt: number | null;
  elapsed: number;
  duration: number;
  isPaused: boolean;
}

// State machine states
export type FocusModePhase =
  | { type: 'idle' }
  | { type: 'task-selection' }
  | { type: 'duration-selection' }
  | { type: 'preparation' }
  | { type: 'session'; timer: TimerState }
  | { type: 'session-done'; totalDuration: number }
  | { type: 'break'; timer: TimerState; isLong: boolean }
  | { type: 'break-done' };

// Simplified state structure
export interface FocusModeState {
  phase: FocusModePhase;
  mode: FocusModeMode;
  isOverlayShown: boolean;
  currentCycle: number; // For Pomodoro
  lastSessionDuration: number;
}

// Mode strategy interface
export interface FocusModeStrategy {
  readonly initialSessionDuration: number;
  readonly shouldStartBreakAfterSession: boolean;
  readonly shouldAutoStartNextSession: boolean;
  getBreakDuration(cycle: number): { duration: number; isLong: boolean } | null;
}

// Helper type guards
export const isSessionPhase = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { type: 'session' }> => {
  return phase.type === 'session';
};

export const isBreakPhase = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { type: 'break' }> => {
  return phase.type === 'break';
};

export const hasTimer = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { timer: TimerState }> => {
  return 'timer' in phase;
};
