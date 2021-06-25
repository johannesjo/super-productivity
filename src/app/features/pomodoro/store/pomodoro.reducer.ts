import { PomodoroActions, PomodoroActionTypes } from './pomodoro.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

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

export const pomodoroReducer = (
  state: PomodoroState = initialPomodoroState,
  action: PomodoroActions,
): PomodoroState => {
  switch (action.type) {
    case PomodoroActionTypes.StartPomodoro: {
      return {
        ...state,
        isManualPause: false,
      };
    }

    case PomodoroActionTypes.PausePomodoro: {
      return {
        ...state,
        isManualPause: true,
      };
    }

    case PomodoroActionTypes.StopPomodoro: {
      return {
        isManualPause: true,
        isBreak: false,
        currentCycle: 0,
      };
    }

    case PomodoroActionTypes.SkipPomodoroBreak:
    case PomodoroActionTypes.FinishPomodoroSession: {
      return {
        ...state,
        isBreak: !state.isBreak,
        currentCycle: state.isBreak ? state.currentCycle + 1 : state.currentCycle,
      };
    }

    default:
      return state;
  }
};
