import { PomodoroActions } from './pomodoro.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const POMODORO_FEATURE_NAME = 'pomodoro';

export interface PomodoroState {
  isManualPause: boolean;
  isBreak: boolean;
  currentCycle: number;
}

export const initialPomodoroState: PomodoroState = {
  isManualPause: false,
  isBreak: false,
  currentCycle: 0,
};

// SELECTORS
export const selectPomodoroFeatureState = createFeatureSelector<PomodoroState>(POMODORO_FEATURE_NAME);
export const selectIsManualPause = createSelector(selectPomodoroFeatureState, state => state.isManualPause);
export const selectIsBreak = createSelector(selectPomodoroFeatureState, state => state.isBreak);
export const selectCurrentCycle = createSelector(selectPomodoroFeatureState, state => state.currentCycle);


export function reducer(state = initialPomodoroState, action: PomodoroActions): PomodoroState {
  switch (action.type) {

    default:
      return state;
  }
}
