import { Action } from '@ngrx/store';

export enum PomodoroActionTypes {
  'StartPomodoro' = '[Pomodoro] Start Pomodoro',
  'PausePomodoro' = '[Pomodoro] Pause Pomodoro',
  'StopPomodoro' = '[Pomodoro] Stop Pomodoro',
  'FinishPomodoroSession' = '[Pomodoro] Finish Pomodoro Session',
  'SkipPomodoroBreak' = '[Pomodoro] Skip Break',
}

export class StartPomodoro implements Action {
  readonly type: string = PomodoroActionTypes.StartPomodoro;
}

export class PausePomodoro implements Action {
  readonly type: string = PomodoroActionTypes.PausePomodoro;

  constructor(public payload: { isBreakEndPause: boolean }) {}
}

export class StopPomodoro implements Action {
  readonly type: string = PomodoroActionTypes.StopPomodoro;
}

export class FinishPomodoroSession implements Action {
  readonly type: string = PomodoroActionTypes.FinishPomodoroSession;
}

// currently only used to notify simple counters
export class SkipPomodoroBreak implements Action {
  readonly type: string = PomodoroActionTypes.SkipPomodoroBreak;
}

export type PomodoroActions =
  | StartPomodoro
  | PausePomodoro
  | StopPomodoro
  | SkipPomodoroBreak
  | FinishPomodoroSession;
