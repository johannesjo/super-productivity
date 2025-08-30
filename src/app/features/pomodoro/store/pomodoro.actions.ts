import { createAction, props } from '@ngrx/store';

enum PomodoroActionTypes {
  'StartPomodoro' = '[Pomodoro] Start Pomodoro',
  'PausePomodoro' = '[Pomodoro] Pause Pomodoro',
  'PausePomodoroBreak' = '[Pomodoro] Pause Pomodoro Break',
  'StartPomodoroBreak' = '[Pomodoro] Start Pomodoro Break',
  'StopPomodoro' = '[Pomodoro] Stop Pomodoro',
  'FinishPomodoroSession' = '[Pomodoro] Finish Pomodoro Session',
  'SkipPomodoroBreak' = '[Pomodoro] Skip Break',
}

export const startPomodoro = createAction(PomodoroActionTypes.StartPomodoro);
export const pausePomodoro = createAction(
  PomodoroActionTypes.PausePomodoro,
  props<{ isBreakEndPause: boolean }>(),
);
export const pausePomodoroBreak = createAction(
  PomodoroActionTypes.PausePomodoroBreak,
  props<{ isBreakStartPause: boolean }>(),
);

export const startPomodoroBreak = createAction(
  PomodoroActionTypes.StartPomodoroBreak,
  props<{ isBreakStart: boolean }>(),
);

export const stopPomodoro = createAction(PomodoroActionTypes.StopPomodoro);
export const finishPomodoroSession = createAction(
  PomodoroActionTypes.FinishPomodoroSession,
);

export const skipPomodoroBreak = createAction(PomodoroActionTypes.SkipPomodoroBreak);
