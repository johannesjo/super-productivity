import {
  focusModeReducer,
  initialState,
  FOCUS_MODE_FEATURE_KEY,
} from './focus-mode.reducer';
import * as a from './focus-mode.actions';
import { FocusModeMode, FocusScreen, FOCUS_MODE_DEFAULTS } from '../focus-mode.model';

describe('FocusModeReducer', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = {} as any;
      const result = focusModeReducer(undefined, action);

      expect(result).toEqual(initialState);
    });

    it('should initialize with idle timer', () => {
      expect(initialState.timer.isRunning).toBe(false);
      expect(initialState.timer.startedAt).toBeNull();
      expect(initialState.timer.elapsed).toBe(0);
      expect(initialState.timer.duration).toBe(0);
      expect(initialState.timer.purpose).toBeNull();
    });

    it('should initialize with TaskSelection screen', () => {
      expect(initialState.currentScreen).toBe(FocusScreen.TaskSelection);
    });

    it('should initialize with overlay hidden', () => {
      expect(initialState.isOverlayShown).toBe(false);
    });

    it('should initialize with Countdown mode as default', () => {
      expect(initialState.mode).toBe(FocusModeMode.Countdown);
    });

    it('should initialize with cycle 1', () => {
      expect(initialState.currentCycle).toBe(1);
    });

    it('should initialize with zero last completed duration', () => {
      expect(initialState.lastCompletedDuration).toBe(0);
    });
  });

  describe('mode actions', () => {
    it('should set focus mode', () => {
      const action = a.setFocusModeMode({ mode: FocusModeMode.Pomodoro });
      const result = focusModeReducer(initialState, action);

      expect(result.mode).toBe(FocusModeMode.Pomodoro);
    });
  });

  describe('overlay actions', () => {
    it('should show focus overlay', () => {
      const action = a.showFocusOverlay();
      const result = focusModeReducer(initialState, action);

      expect(result.isOverlayShown).toBe(true);
    });

    it('should hide focus overlay', () => {
      const state = { ...initialState, isOverlayShown: true };
      const action = a.hideFocusOverlay();
      const result = focusModeReducer(state, action);

      expect(result.isOverlayShown).toBe(false);
    });
  });

  describe('screen navigation actions', () => {
    it('should navigate to task selection screen', () => {
      const state = { ...initialState, currentScreen: FocusScreen.Main };
      const action = a.selectFocusTask();
      const result = focusModeReducer(state, action);

      expect(result.currentScreen).toBe(FocusScreen.TaskSelection);
    });

    it('should navigate to duration selection screen', () => {
      const action = a.selectFocusDuration();
      const result = focusModeReducer(initialState, action);

      expect(result.currentScreen).toBe(FocusScreen.DurationSelection);
    });

    it('should navigate to preparation screen', () => {
      const action = a.startFocusPreparation();
      const result = focusModeReducer(initialState, action);

      expect(result.currentScreen).toBe(FocusScreen.Preparation);
    });

    it('should navigate to main screen', () => {
      const action = a.navigateToMainScreen();
      const result = focusModeReducer(initialState, action);

      expect(result.currentScreen).toBe(FocusScreen.Main);
    });
  });

  describe('session actions', () => {
    it('should start focus session with default duration', () => {
      const action = a.startFocusSession({});
      const result = focusModeReducer(initialState, action);

      expect(result.currentScreen).toBe(FocusScreen.Main);
      expect(result.timer.isRunning).toBe(true);
      expect(result.timer.purpose).toBe('work');
      expect(result.timer.duration).toBe(FOCUS_MODE_DEFAULTS.SESSION_DURATION);
      expect(result.timer.elapsed).toBe(0);
      expect(result.timer.startedAt).toBeGreaterThan(0);
    });

    it('should start focus session with custom duration', () => {
      const customDuration = 30 * 60 * 1000; // 30 minutes
      const action = a.startFocusSession({ duration: customDuration });
      const result = focusModeReducer(initialState, action);

      expect(result.timer.duration).toBe(customDuration);
    });

    it('should pause focus session', () => {
      const runningState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 1500000,
          purpose: 'work' as const,
        },
      };

      const action = a.pauseFocusSession();
      const result = focusModeReducer(runningState, action);

      expect(result.timer.isRunning).toBe(false);
    });

    it('should not pause non-work sessions', () => {
      const breakState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 300000,
          purpose: 'break' as const,
        },
      };

      const action = a.pauseFocusSession();
      const result = focusModeReducer(breakState, action);

      expect(result.timer.isRunning).toBe(true);
    });

    it('should unpause focus session', () => {
      const pausedState = {
        ...initialState,
        timer: {
          isRunning: false,
          startedAt: Date.now() - 60000,
          elapsed: 60000,
          duration: 1500000,
          purpose: 'work' as const,
        },
      };

      const action = a.unPauseFocusSession();
      const result = focusModeReducer(pausedState, action);

      expect(result.timer.isRunning).toBe(true);
    });

    it('should complete focus session', () => {
      const runningState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now() - 60000,
          elapsed: 60000,
          duration: 1500000,
          purpose: 'work' as const,
        },
      };

      const action = a.completeFocusSession({ isManual: false });
      const result = focusModeReducer(runningState, action);

      expect(result.currentScreen).toBe(FocusScreen.SessionDone);
      expect(result.timer.isRunning).toBe(false);
      expect(result.timer.purpose).toBeNull();
      expect(result.lastCompletedDuration).toBe(60000);
    });

    it('should cancel focus session', () => {
      const runningState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 1500000,
          purpose: 'work' as const,
        },
        currentScreen: FocusScreen.Main,
        isOverlayShown: true,
      };

      const action = a.cancelFocusSession();
      const result = focusModeReducer(runningState, action);

      expect(result.currentScreen).toBe(FocusScreen.TaskSelection);
      expect(result.timer.isRunning).toBe(false);
      expect(result.timer.purpose).toBeNull();
      expect(result.isOverlayShown).toBe(false);
    });
  });

  describe('break actions', () => {
    it('should start break with default duration', () => {
      const action = a.startBreak({});
      const result = focusModeReducer(initialState, action);

      expect(result.currentScreen).toBe(FocusScreen.Break);
      expect(result.timer.isRunning).toBe(true);
      expect(result.timer.purpose).toBe('break');
      expect(result.timer.duration).toBe(FOCUS_MODE_DEFAULTS.SHORT_BREAK_DURATION);
      expect(result.timer.isLongBreak).toBe(false);
    });

    it('should start long break', () => {
      const action = a.startBreak({
        duration: FOCUS_MODE_DEFAULTS.LONG_BREAK_DURATION,
        isLongBreak: true,
      });
      const result = focusModeReducer(initialState, action);

      expect(result.timer.isLongBreak).toBe(true);
      expect(result.timer.duration).toBe(FOCUS_MODE_DEFAULTS.LONG_BREAK_DURATION);
    });

    it('should skip break', () => {
      const breakState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 300000,
          purpose: 'break' as const,
        },
        currentScreen: FocusScreen.Break,
      };

      const action = a.skipBreak();
      const result = focusModeReducer(breakState, action);

      expect(result.currentScreen).toBe(FocusScreen.TaskSelection);
      expect(result.timer.isRunning).toBe(false);
      expect(result.timer.purpose).toBeNull();
    });

    it('should complete break', () => {
      const breakState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: Date.now(),
          elapsed: 0,
          duration: 300000,
          purpose: 'break' as const,
        },
        currentScreen: FocusScreen.Break,
      };

      const action = a.completeBreak();
      const result = focusModeReducer(breakState, action);

      expect(result.currentScreen).toBe(FocusScreen.TaskSelection);
      expect(result.timer.isRunning).toBe(false);
      expect(result.timer.purpose).toBeNull();
    });
  });

  describe('timer tick action', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2023, 0, 1, 10, 0, 0));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should update elapsed time for running timer', () => {
      const startTime = Date.now();
      const runningState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: startTime,
          elapsed: 0,
          duration: 1500000,
          purpose: 'work' as const,
        },
      };

      jasmine.clock().tick(5000); // 5 seconds

      const action = a.tick();
      const result = focusModeReducer(runningState, action);

      expect(result.timer.elapsed).toBe(5000);
    });

    it('should not update elapsed time for stopped timer', () => {
      const stoppedState = {
        ...initialState,
        timer: {
          isRunning: false,
          startedAt: Date.now(),
          elapsed: 60000,
          duration: 1500000,
          purpose: null,
        },
      };

      const action = a.tick();
      const result = focusModeReducer(stoppedState, action);

      expect(result.timer.elapsed).toBe(60000);
    });

    it('should complete work session when duration reached', () => {
      const startTime = Date.now() - 1500000; // Started 25 minutes ago
      const runningState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: startTime,
          elapsed: 1500000,
          duration: 1500000,
          purpose: 'work' as const,
        },
      };

      const action = a.tick();
      const result = focusModeReducer(runningState, action);

      expect(result.timer.isRunning).toBe(false);
      expect(result.lastCompletedDuration).toBe(1500000);
    });

    it('should complete break session when duration reached', () => {
      const startTime = Date.now() - 300000; // Started 5 minutes ago
      const breakState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: startTime,
          elapsed: 300000,
          duration: 300000,
          purpose: 'break' as const,
        },
      };

      const action = a.tick();
      const result = focusModeReducer(breakState, action);

      expect(result.timer.isRunning).toBe(false);
    });

    it('should handle flowtime mode (no duration limit)', () => {
      const startTime = Date.now();
      const flowtimeState = {
        ...initialState,
        timer: {
          isRunning: true,
          startedAt: startTime,
          elapsed: 0,
          duration: 0, // No duration limit in flowtime
          purpose: 'work' as const,
        },
      };

      jasmine.clock().tick(3600000); // 1 hour

      const action = a.tick();
      const result = focusModeReducer(flowtimeState, action);

      expect(result.timer.isRunning).toBe(true);
      expect(result.timer.elapsed).toBe(3600000);
    });
  });

  describe('duration setting', () => {
    it('should set focus session duration', () => {
      const customDuration = 30 * 60 * 1000; // 30 minutes
      const action = a.setFocusSessionDuration({ focusSessionDuration: customDuration });
      const result = focusModeReducer(initialState, action);

      expect(result.timer.duration).toBe(customDuration);
    });
  });

  describe('cycle management', () => {
    it('should increment cycle', () => {
      const action = a.incrementCycle();
      const result = focusModeReducer(initialState, action);

      expect(result.currentCycle).toBe(2);
    });

    it('should reset cycles', () => {
      const state = { ...initialState, currentCycle: 5 };
      const action = a.resetCycles();
      const result = focusModeReducer(state, action);

      expect(result.currentCycle).toBe(1);
    });
  });

  describe('FOCUS_MODE_FEATURE_KEY', () => {
    it('should export the correct feature key', () => {
      expect(FOCUS_MODE_FEATURE_KEY).toBe('focusMode');
    });
  });
});
