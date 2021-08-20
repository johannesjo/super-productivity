import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import {
  finishPomodoroSession,
  pausePomodoro,
  skipPomodoroBreak,
  startPomodoro,
  stopPomodoro,
} from './pomodoro.actions';

export const POMODORO_FEATURE_NAME = 'pomodoro';

export interface PomodoroState {
  isManualPause: boolean;
  isBreak: boolean;
  currentCycle: number;
}

export const initialPomodoroState: PomodoroState = {
  isManualPause: true,
  isBreak: false,
  currentCycle: 0,
};

// SELECTORS
export const selectPomodoroFeatureState =
  createFeatureSelector<PomodoroState>(POMODORO_FEATURE_NAME);
export const selectIsManualPause = createSelector(
  selectPomodoroFeatureState,
  (state) => state.isManualPause,
);
export const selectIsBreak = createSelector(
  selectPomodoroFeatureState,
  (state) => state.isBreak,
);
export const selectCurrentCycle = createSelector(
  selectPomodoroFeatureState,
  (state) => state.currentCycle,
);

export const pomodoroReducer = createReducer<PomodoroState>(
  initialPomodoroState,
  on(startPomodoro, (state) => {
    return {
      ...state,
      isManualPause: false,
    };
  }),

  on(pausePomodoro, (state) => {
    return {
      ...state,
      isManualPause: true,
    };
  }),

  on(stopPomodoro, () => {
    return {
      isManualPause: true,
      isBreak: false,
      currentCycle: 0,
    };
  }),

  on(finishPomodoroSession, skipPomodoroBreak, (state) => {
    return {
      ...state,
      isBreak: !state.isBreak,
      currentCycle: state.isBreak ? state.currentCycle + 1 : state.currentCycle,
    };
  }),
);
