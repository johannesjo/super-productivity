import { createFeature, createReducer, on } from '@ngrx/store';
import { AppStateActions } from './app-state.actions';
import { getLocalDateStr } from '../../util/get-local-date-str';

export const appStateFeatureKey = 'appState';

export interface AppState {
  todayStr: string;
}

export const appStateInitialState: AppState = {
  todayStr: getLocalDateStr(),
};

export const appStateReducer = createReducer(
  appStateInitialState,
  on(AppStateActions.setTodayString, (state, { todayStr }) => ({
    ...state,
    todayStr,
  })),
);

export const appStateFeature = createFeature({
  name: appStateFeatureKey,
  reducer: appStateReducer,
});
