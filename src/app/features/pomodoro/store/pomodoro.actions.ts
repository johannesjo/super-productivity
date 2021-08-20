import { createAction, props } from '@ngrx/store';

enum PomodoroActionTypes {
  'StartPomodoro' = '[Pomodoro] Start Pomodoro',
  'PausePomodoro' = '[Pomodoro] Pause Pomodoro',
  'StopPomodoro' = '[Pomodoro] Stop Pomodoro',
  'FinishPomodoroSession' = '[Pomodoro] Finish Pomodoro Session',
  'SkipPomodoroBreak' = '[Pomodoro] Skip Break',
}

export const startPomodoro = createAction(PomodoroActionTypes.StartPomodoro);
export const pausePomodoro = createAction(
  PomodoroActionTypes.PausePomodoro,
  props<{ isBreakEndPause: boolean }>(),
);

export const stopPomodoro = createAction(PomodoroActionTypes.StopPomodoro);
export const finishPomodoroSession = createAction(
  PomodoroActionTypes.FinishPomodoroSession,
);
// currently only used to notify simple counters
export const skipPomodoroBreak = createAction(PomodoroActionTypes.SkipPomodoroBreak);
