// Unified timer state
export interface TimerState {
  startedAt: number | null;
  elapsed: number;
  duration: number;
  isPaused: boolean;
}

// Phase types enum
export enum FocusModePhaseType {
  Idle = 'idle',
  TaskSelection = 'task-selection',
  DurationSelection = 'duration-selection',
  Preparation = 'preparation',
  Session = 'session',
  SessionDone = 'session-done',
  Break = 'break',
  BreakDone = 'break-done',
}

// State machine states
export type FocusModePhase =
  | { type: FocusModePhaseType.Idle }
  | { type: FocusModePhaseType.TaskSelection }
  | { type: FocusModePhaseType.DurationSelection }
  | { type: FocusModePhaseType.Preparation }
  | { type: FocusModePhaseType.Session; timer: TimerState }
  | { type: FocusModePhaseType.SessionDone; totalDuration: number }
  | { type: FocusModePhaseType.Break; timer: TimerState; isLong: boolean }
  | { type: FocusModePhaseType.BreakDone };

export enum FocusModePage {
  Main = 'Main',
  SessionDone = 'SessionDone',
  TaskSelection = 'TaskSelection',
  DurationSelection = 'DurationSelection',
  Preparation = 'Preparation',
  Break = 'Break',
}

export enum FocusModeMode {
  'Flowtime' = 'Flowtime',
  'Pomodoro' = 'Pomodoro',
  'Countdown' = 'Countdown',
}

// Simplified state structure
export interface FocusModeState {
  phase: FocusModePhase;
  mode: FocusModeMode;
  isOverlayShown: boolean;
  isSessionRunning: boolean; // Tracks if a focus session is actively running
  currentCycle: number; // For Pomodoro
  lastSessionDuration: number;
}

// Mode strategy interface
export interface FocusModeStrategy {
  readonly initialSessionDuration: number;
  readonly shouldStartBreakAfterSession: boolean;
  readonly shouldAutoStartNextSession: boolean;
  getBreakDuration(cycle: number): { duration: number; isLong: boolean } | null;
  getNextPhaseAfterTaskSelection(skipPreparation: boolean): {
    phase:
      | FocusModePhaseType.DurationSelection
      | FocusModePhaseType.Preparation
      | FocusModePhaseType.Session;
    duration?: number;
  };
}

// Helper type guards
export const isSessionPhase = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { type: FocusModePhaseType.Session }> => {
  return phase.type === FocusModePhaseType.Session;
};

export const isBreakPhase = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { type: FocusModePhaseType.Break }> => {
  return phase.type === FocusModePhaseType.Break;
};

export const hasTimer = (
  phase: FocusModePhase,
): phase is Extract<FocusModePhase, { timer: TimerState }> => {
  return 'timer' in phase;
};
