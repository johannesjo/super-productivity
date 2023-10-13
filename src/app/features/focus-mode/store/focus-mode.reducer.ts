import { createReducer, on } from '@ngrx/store';
import * as FocusModeActions from './focus-mode.actions';

export const FOCUS_MODE_FEATURE_KEY = 'focusMode';

export interface State {
  isFocusOverlayShown: boolean;
  isFocusSessionRunning: boolean;
  focusSessionDuration: number;
}

export const initialState: State = {
  isFocusOverlayShown: false,
  isFocusSessionRunning: false,
  focusSessionDuration: 20 * 60 * 1000,
};

export const focusModeReducer = createReducer(
  initialState,

  on(FocusModeActions.setFocusSessionDuration, (state, { focusSessionDuration }) => ({
    ...state,
    focusSessionDuration,
  })),

  on(FocusModeActions.setFocusSessionRunning, (state, { isFocusSessionRunning }) => ({
    ...state,
    isFocusSessionRunning,
  })),

  on(FocusModeActions.toggleIsFocusOverlayShown, (state) => ({
    ...state,
    isFocusOverlayShown: !state.isFocusOverlayShown,
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
