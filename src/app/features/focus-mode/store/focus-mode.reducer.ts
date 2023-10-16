import { createReducer, on } from '@ngrx/store';
import * as FocusModeActions from './focus-mode.actions';
import { FocusModePage } from '../focus-mode.const';

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

export interface State {
  isFocusOverlayShown: boolean;
  isFocusSessionRunning: boolean;
  focusSessionDuration: number;
  focusSessionTimeToGo: number;
  focusSessionActivePage: FocusModePage;
}

export const initialState: State = {
  isFocusOverlayShown: false,
  isFocusSessionRunning: false,
  focusSessionDuration: 20 * 60 * 1000,
  focusSessionTimeToGo: 0,
  focusSessionActivePage: FocusModePage.TaskSelection,
};

export const focusModeReducer = createReducer(
  initialState,

  on(
    FocusModeActions.setFocusSessionActivePage,
    (state, { focusActivePage: focusSessionActivePage }) => ({
      ...state,
      focusSessionActivePage,
    }),
  ),
  on(FocusModeActions.setFocusSessionDuration, (state, { focusSessionDuration }) => ({
    ...state,
    focusSessionDuration,
  })),

  on(FocusModeActions.setFocusSessionRunning, (state, { isFocusSessionRunning }) => ({
    ...state,
    isFocusSessionRunning,
  })),

  on(FocusModeActions.setFocusSessionTimeToGo, (state, { focusSessionTimeToGo }) => ({
    ...state,
    focusSessionTimeToGo,
  })),

  on(FocusModeActions.startFocusSession, (state) => ({
    ...state,
    isFocusSessionRunning: true,
    focusSessionElapsedTime: 0,
    focusSessionActivePage: FocusModePage.Main,
  })),
  on(FocusModeActions.focusSessionDone, (state) => ({
    ...state,
    isFocusSessionRunning: false,
    focusSessionElapsedTime: 0,
    focusSessionActivePage: FocusModePage.TaskDone,
  })),

  on(FocusModeActions.showFocusOverlay, (state) => ({
    ...state,
    isFocusOverlayShown: true,
  })),
  on(FocusModeActions.hideFocusOverlay, (state) => ({
    ...state,
    isFocusOverlayShown: false,
  })),
);
