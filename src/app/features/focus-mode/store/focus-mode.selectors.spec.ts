import {
  selectFocusModeState,
  selectIsFocusSessionRunning,
  selectFocusModeMode,
  selectFocusSessionDuration,
  selectIsFocusOverlayShown,
  selectFocusSessionTimeElapsed,
  selectLastSessionTotalDurationOrTimeElapsedFallback,
  selectFocusSessionActivePage,
} from './focus-mode.selectors';
import { FOCUS_MODE_FEATURE_KEY, State } from './focus-mode.reducer';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';

describe('FocusMode Selectors', () => {
  const createFocusModeState = (overrides?: Partial<State>): State => ({
    isFocusOverlayShown: false,
    isFocusSessionRunning: false,
    focusSessionDuration: 25 * 60 * 1000,
    focusSessionTimeElapsed: 0,
    lastSessionTotalDuration: 0,
    focusSessionActivePage: FocusModePage.TaskSelection,
    mode: FocusModeMode.Flowtime,
    ...overrides,
  });

  const createRootState = (focusModeState: State): any => ({
    [FOCUS_MODE_FEATURE_KEY]: focusModeState,
  });

  describe('selectFocusModeState', () => {
    it('should select the feature state', () => {
      const focusModeState = createFocusModeState();
      const rootState = createRootState(focusModeState);
      const result = selectFocusModeState(rootState);

      expect(result).toEqual(focusModeState);
    });
  });

  describe('selectIsFocusSessionRunning', () => {
    it('should select if session is running', () => {
      const focusModeState = createFocusModeState({ isFocusSessionRunning: true });
      const rootState = createRootState(focusModeState);
      const result = selectIsFocusSessionRunning(rootState);

      expect(result).toBe(true);
    });

    it('should return false when session is not running', () => {
      const focusModeState = createFocusModeState({ isFocusSessionRunning: false });
      const rootState = createRootState(focusModeState);
      const result = selectIsFocusSessionRunning(rootState);

      expect(result).toBe(false);
    });
  });

  describe('selectFocusModeMode', () => {
    it('should select the focus mode', () => {
      const focusModeState = createFocusModeState({ mode: FocusModeMode.Pomodoro });
      const rootState = createRootState(focusModeState);
      const result = selectFocusModeMode(rootState);

      expect(result).toBe(FocusModeMode.Pomodoro);
    });
  });

  describe('selectFocusSessionDuration', () => {
    it('should select the session duration', () => {
      const duration = 30 * 60 * 1000;
      const focusModeState = createFocusModeState({ focusSessionDuration: duration });
      const rootState = createRootState(focusModeState);
      const result = selectFocusSessionDuration(rootState);

      expect(result).toBe(duration);
    });
  });

  describe('selectIsFocusOverlayShown', () => {
    it('should select if overlay is shown', () => {
      const focusModeState = createFocusModeState({ isFocusOverlayShown: true });
      const rootState = createRootState(focusModeState);
      const result = selectIsFocusOverlayShown(rootState);

      expect(result).toBe(true);
    });

    it('should return false when overlay is hidden', () => {
      const focusModeState = createFocusModeState({ isFocusOverlayShown: false });
      const rootState = createRootState(focusModeState);
      const result = selectIsFocusOverlayShown(rootState);

      expect(result).toBe(false);
    });
  });

  describe('selectFocusSessionTimeElapsed', () => {
    it('should select time elapsed', () => {
      const timeElapsed = 10 * 60 * 1000;
      const focusModeState = createFocusModeState({
        focusSessionTimeElapsed: timeElapsed,
      });
      const rootState = createRootState(focusModeState);
      const result = selectFocusSessionTimeElapsed(rootState);

      expect(result).toBe(timeElapsed);
    });
  });

  describe('selectLastSessionTotalDurationOrTimeElapsedFallback', () => {
    it('should return lastSessionTotalDuration when available', () => {
      const lastDuration = 25 * 60 * 1000;
      const timeElapsed = 10 * 60 * 1000;
      const focusModeState = createFocusModeState({
        lastSessionTotalDuration: lastDuration,
        focusSessionTimeElapsed: timeElapsed,
      });
      const rootState = createRootState(focusModeState);
      const result = selectLastSessionTotalDurationOrTimeElapsedFallback(rootState);

      expect(result).toBe(lastDuration);
    });

    it('should fallback to timeElapsed when lastSessionTotalDuration is 0', () => {
      const timeElapsed = 15 * 60 * 1000;
      const focusModeState = createFocusModeState({
        lastSessionTotalDuration: 0,
        focusSessionTimeElapsed: timeElapsed,
      });
      const rootState = createRootState(focusModeState);
      const result = selectLastSessionTotalDurationOrTimeElapsedFallback(rootState);

      expect(result).toBe(timeElapsed);
    });
  });

  describe('selectFocusSessionActivePage', () => {
    it('should select the active page', () => {
      const focusModeState = createFocusModeState({
        focusSessionActivePage: FocusModePage.Main,
      });
      const rootState = createRootState(focusModeState);
      const result = selectFocusSessionActivePage(rootState);

      expect(result).toBe(FocusModePage.Main);
    });

    it('should return TaskSelection by default', () => {
      const focusModeState = createFocusModeState();
      const rootState = createRootState(focusModeState);
      const result = selectFocusSessionActivePage(rootState);

      expect(result).toBe(FocusModePage.TaskSelection);
    });
  });
});
