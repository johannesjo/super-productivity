import * as selectors from './focus-mode.selectors';
import {
  FocusModeState,
  FocusScreen,
  FocusModeMode,
  FocusMainUIState,
  TimerState,
} from '../focus-mode.model';

describe('FocusModeSelectors', () => {
  const createMockTimer = (overrides: Partial<TimerState> = {}): TimerState => ({
    isRunning: false,
    startedAt: null,
    elapsed: 0,
    duration: 1500000,
    purpose: null,
    ...overrides,
  });

  const createMockState = (
    overrides: Partial<FocusModeState> = {},
  ): { focusMode: FocusModeState } => ({
    focusMode: {
      timer: createMockTimer(),
      currentScreen: FocusScreen.Main,
      mainState: FocusMainUIState.Preparation,
      isOverlayShown: false,
      mode: FocusModeMode.Pomodoro,
      currentCycle: 1,
      lastCompletedDuration: 0,
      ...overrides,
    },
  });

  describe('selectFocusModeState', () => {
    it('should select the focus mode state', () => {
      const state = createMockState();
      const result = selectors.selectFocusModeState(state);

      expect(result).toEqual(state.focusMode);
    });
  });

  describe('selectTimer', () => {
    it('should select the timer state', () => {
      const timer = createMockTimer({ elapsed: 60000 });
      const state = createMockState({ timer });
      const result = selectors.selectTimer(state);

      expect(result).toEqual(timer);
    });
  });

  describe('selectCurrentScreen', () => {
    it('should select the current screen', () => {
      const state = createMockState({ currentScreen: FocusScreen.Main });
      const result = selectors.selectCurrentScreen(state);

      expect(result).toBe(FocusScreen.Main);
    });
  });

  describe('selectMainState', () => {
    it('should select the main state', () => {
      const state = createMockState({ mainState: FocusMainUIState.Countdown });
      const result = selectors.selectMainState(state);

      expect(result).toBe(FocusMainUIState.Countdown);
    });
  });

  describe('selectMode', () => {
    it('should select the focus mode', () => {
      const state = createMockState({ mode: FocusModeMode.Flowtime });
      const result = selectors.selectMode(state);

      expect(result).toBe(FocusModeMode.Flowtime);
    });
  });

  describe('selectIsOverlayShown', () => {
    it('should select overlay visibility', () => {
      const state = createMockState({ isOverlayShown: true });
      const result = selectors.selectIsOverlayShown(state);

      expect(result).toBe(true);
    });
  });

  describe('selectCurrentCycle', () => {
    it('should select the current cycle', () => {
      const state = createMockState({ currentCycle: 3 });
      const result = selectors.selectCurrentCycle(state);

      expect(result).toBe(3);
    });
  });

  describe('selectLastSessionDuration', () => {
    it('should select the last session duration', () => {
      const state = createMockState({ lastCompletedDuration: 1800000 });
      const result = selectors.selectLastSessionDuration(state);

      expect(result).toBe(1800000);
    });
  });

  describe('selectIsSessionRunning', () => {
    it('should return true when timer is running with work purpose', () => {
      const timer = createMockTimer({ isRunning: true, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionRunning(state);

      expect(result).toBe(true);
    });

    it('should return false when timer is running with break purpose', () => {
      const timer = createMockTimer({ isRunning: true, purpose: 'break' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionRunning(state);

      expect(result).toBe(false);
    });

    it('should return false when timer is not running', () => {
      const timer = createMockTimer({ isRunning: false, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionRunning(state);

      expect(result).toBe(false);
    });
  });

  describe('selectIsSessionPaused', () => {
    it('should return true when work session is paused', () => {
      const timer = createMockTimer({ isRunning: false, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionPaused(state);

      expect(result).toBe(true);
    });

    it('should return false when work session is running', () => {
      const timer = createMockTimer({ isRunning: true, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionPaused(state);

      expect(result).toBe(false);
    });

    it('should return false for break sessions', () => {
      const timer = createMockTimer({ isRunning: false, purpose: 'break' });
      const state = createMockState({ timer });
      const result = selectors.selectIsSessionPaused(state);

      expect(result).toBe(false);
    });
  });

  describe('selectIsBreakActive', () => {
    it('should return true when timer purpose is break', () => {
      const timer = createMockTimer({ purpose: 'break' });
      const state = createMockState({ timer });
      const result = selectors.selectIsBreakActive(state);

      expect(result).toBe(true);
    });

    it('should return false when timer purpose is work', () => {
      const timer = createMockTimer({ purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsBreakActive(state);

      expect(result).toBe(false);
    });

    it('should return false when timer purpose is null', () => {
      const timer = createMockTimer({ purpose: null });
      const state = createMockState({ timer });
      const result = selectors.selectIsBreakActive(state);

      expect(result).toBe(false);
    });
  });

  describe('selectIsLongBreak', () => {
    it('should return true for long break', () => {
      const timer = createMockTimer({ purpose: 'break', isLongBreak: true });
      const state = createMockState({ timer });
      const result = selectors.selectIsLongBreak(state);

      expect(result).toBe(true);
    });

    it('should return false for short break', () => {
      const timer = createMockTimer({ purpose: 'break', isLongBreak: false });
      const state = createMockState({ timer });
      const result = selectors.selectIsLongBreak(state);

      expect(result).toBe(false);
    });

    it('should return false for work session', () => {
      const timer = createMockTimer({ purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsLongBreak(state);

      expect(result).toBe(false);
    });

    it('should return false when isLongBreak is undefined', () => {
      const timer = createMockTimer({ purpose: 'break' }); // isLongBreak is undefined
      const state = createMockState({ timer });
      const result = selectors.selectIsLongBreak(state);

      expect(result).toBe(false);
    });
  });

  describe('selectTimeElapsed', () => {
    it('should select elapsed time', () => {
      const timer = createMockTimer({ elapsed: 300000 });
      const state = createMockState({ timer });
      const result = selectors.selectTimeElapsed(state);

      expect(result).toBe(300000);
    });
  });

  describe('selectTimeDuration', () => {
    it('should select timer duration', () => {
      const timer = createMockTimer({ duration: 1800000 });
      const state = createMockState({ timer });
      const result = selectors.selectTimeDuration(state);

      expect(result).toBe(1800000);
    });
  });

  describe('selectTimeRemaining', () => {
    it('should calculate time remaining', () => {
      const timer = createMockTimer({ elapsed: 300000, duration: 1500000 });
      const state = createMockState({ timer });
      const result = selectors.selectTimeRemaining(state);

      expect(result).toBe(1200000);
    });

    it('should return 0 when elapsed exceeds duration', () => {
      const timer = createMockTimer({ elapsed: 1600000, duration: 1500000 });
      const state = createMockState({ timer });
      const result = selectors.selectTimeRemaining(state);

      expect(result).toBe(0);
    });

    it('should handle zero duration', () => {
      const timer = createMockTimer({ elapsed: 300000, duration: 0 });
      const state = createMockState({ timer });
      const result = selectors.selectTimeRemaining(state);

      expect(result).toBe(0);
    });
  });

  describe('selectProgress', () => {
    it('should calculate progress percentage', () => {
      const timer = createMockTimer({ elapsed: 750000, duration: 1500000 });
      const state = createMockState({ timer });
      const result = selectors.selectProgress(state);

      expect(result).toBe(50);
    });

    it('should return 0 for zero duration', () => {
      const timer = createMockTimer({ elapsed: 300000, duration: 0 });
      const state = createMockState({ timer });
      const result = selectors.selectProgress(state);

      expect(result).toBe(0);
    });

    it('should handle 100% progress', () => {
      const timer = createMockTimer({ elapsed: 1500000, duration: 1500000 });
      const state = createMockState({ timer });
      const result = selectors.selectProgress(state);

      expect(result).toBe(100);
    });

    it('should handle progress over 100%', () => {
      const timer = createMockTimer({ elapsed: 1800000, duration: 1500000 });
      const state = createMockState({ timer });
      const result = selectors.selectProgress(state);

      expect(result).toBe(120);
    });
  });

  describe('selectIsRunning', () => {
    it('should return true when timer is running with work purpose', () => {
      const timer = createMockTimer({ isRunning: true, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsRunning(state);

      expect(result).toBe(true);
    });

    it('should return true when timer is running with break purpose', () => {
      const timer = createMockTimer({ isRunning: true, purpose: 'break' });
      const state = createMockState({ timer });
      const result = selectors.selectIsRunning(state);

      expect(result).toBe(true);
    });

    it('should return false when timer is running but purpose is null', () => {
      const timer = createMockTimer({ isRunning: true, purpose: null });
      const state = createMockState({ timer });
      const result = selectors.selectIsRunning(state);

      expect(result).toBe(false);
    });

    it('should return false when timer is not running', () => {
      const timer = createMockTimer({ isRunning: false, purpose: 'work' });
      const state = createMockState({ timer });
      const result = selectors.selectIsRunning(state);

      expect(result).toBe(false);
    });
  });
});
