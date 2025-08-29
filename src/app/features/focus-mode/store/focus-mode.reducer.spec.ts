import { focusModeReducer, initialState, State } from './focus-mode.reducer';
import {
  cancelFocusSession,
  focusSessionDone,
  hideFocusOverlay,
  pauseFocusSession,
  setFocusModeMode,
  setFocusSessionActivePage,
  setFocusSessionDuration,
  setFocusSessionTimeElapsed,
  showFocusOverlay,
  startFocusSession,
  unPauseFocusSession,
  startBreak,
  setBreakTimeElapsed,
  skipBreak,
  completeBreak,
  incrementCycle,
  resetCycles,
} from './focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';

describe('FocusMode Reducer', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const action = { type: 'unknown' };
      const state = focusModeReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.isFocusOverlayShown).toBe(false);
      expect(state.isFocusSessionRunning).toBe(false);
      expect(state.focusSessionDuration).toBe(25 * 60 * 1000);
      expect(state.focusSessionTimeElapsed).toBe(0);
      expect(state.lastSessionTotalDuration).toBe(0);
      expect(state.focusSessionActivePage).toBe(FocusModePage.TaskSelection);
      // Break-related initial state
      expect(state.isBreak).toBe(false);
      expect(state.breakTimeElapsed).toBe(0);
      expect(state.breakDuration).toBe(5 * 60 * 1000);
      expect(state.isBreakLong).toBe(false);
      expect(state.currentCycle).toBe(1);
    });
  });

  describe('setFocusSessionActivePage', () => {
    it('should update active page', () => {
      const newPage = FocusModePage.Main;
      const action = setFocusSessionActivePage({ focusActivePage: newPage });
      const state = focusModeReducer(initialState, action);

      expect(state.focusSessionActivePage).toBe(newPage);
      expect(state).not.toBe(initialState);
    });
  });

  describe('setFocusModeMode', () => {
    it('should update focus mode', () => {
      const newMode = FocusModeMode.Pomodoro;
      const action = setFocusModeMode({ mode: newMode });
      const state = focusModeReducer(initialState, action);

      expect(state.mode).toBe(newMode);
    });
  });

  describe('setFocusSessionDuration', () => {
    it('should update session duration', () => {
      const newDuration = 30 * 60 * 1000;
      const action = setFocusSessionDuration({ focusSessionDuration: newDuration });
      const state = focusModeReducer(initialState, action);

      expect(state.focusSessionDuration).toBe(newDuration);
    });
  });

  describe('setFocusSessionTimeElapsed', () => {
    it('should update time elapsed', () => {
      const timeElapsed = 5 * 60 * 1000;
      const action = setFocusSessionTimeElapsed({ focusSessionTimeElapsed: timeElapsed });
      const state = focusModeReducer(initialState, action);

      expect(state.focusSessionTimeElapsed).toBe(timeElapsed);
    });
  });

  describe('startFocusSession', () => {
    it('should start session with default duration if current is 0', () => {
      const stateWithZeroDuration: State = {
        ...initialState,
        focusSessionDuration: 0,
      };
      const action = startFocusSession();
      const state = focusModeReducer(stateWithZeroDuration, action);

      expect(state.isFocusSessionRunning).toBe(true);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Main);
      expect(state.focusSessionDuration).toBe(25 * 60 * 1000);
      expect(state.lastSessionTotalDuration).toBe(0);
    });

    it('should keep existing duration if greater than 0', () => {
      const existingDuration = 30 * 60 * 1000;
      const stateWithDuration: State = {
        ...initialState,
        focusSessionDuration: existingDuration,
      };
      const action = startFocusSession();
      const state = focusModeReducer(stateWithDuration, action);

      expect(state.isFocusSessionRunning).toBe(true);
      expect(state.focusSessionDuration).toBe(existingDuration);
    });
  });

  describe('focusSessionDone', () => {
    it('should reset session when isResetPlannedSessionDuration is true', () => {
      const stateWithSession: State = {
        ...initialState,
        isFocusSessionRunning: true,
        focusSessionTimeElapsed: 25 * 60 * 1000,
        focusSessionDuration: 25 * 60 * 1000,
      };
      const action = focusSessionDone({ isResetPlannedSessionDuration: true });
      const state = focusModeReducer(stateWithSession, action);

      expect(state.isFocusSessionRunning).toBe(false);
      expect(state.isFocusOverlayShown).toBe(true);
      expect(state.focusSessionActivePage).toBe(FocusModePage.SessionDone);
      expect(state.focusSessionDuration).toBe(25 * 60 * 1000);
      expect(state.lastSessionTotalDuration).toBe(25 * 60 * 1000);
      expect(state.focusSessionTimeElapsed).toBe(0);
    });

    it('should not reset session when isResetPlannedSessionDuration is false', () => {
      const stateWithSession: State = {
        ...initialState,
        isFocusSessionRunning: true,
        focusSessionTimeElapsed: 15 * 60 * 1000,
        focusSessionDuration: 25 * 60 * 1000,
      };
      const action = focusSessionDone({ isResetPlannedSessionDuration: false });
      const state = focusModeReducer(stateWithSession, action);

      expect(state.isFocusSessionRunning).toBe(false);
      expect(state.isFocusOverlayShown).toBe(true);
      expect(state.focusSessionActivePage).toBe(FocusModePage.SessionDone);
      expect(state.focusSessionTimeElapsed).toBe(15 * 60 * 1000);
      expect(state.focusSessionDuration).toBe(25 * 60 * 1000);
    });
  });

  describe('pauseFocusSession', () => {
    it('should pause running session', () => {
      const runningState: State = {
        ...initialState,
        isFocusSessionRunning: true,
      };
      const action = pauseFocusSession();
      const state = focusModeReducer(runningState, action);

      expect(state.isFocusSessionRunning).toBe(false);
    });
  });

  describe('unPauseFocusSession', () => {
    it('should unpause session', () => {
      const pausedState: State = {
        ...initialState,
        isFocusSessionRunning: false,
      };
      const action = unPauseFocusSession({});
      const state = focusModeReducer(pausedState, action);

      expect(state.isFocusSessionRunning).toBe(true);
    });

    it('should handle idle time parameter', () => {
      const pausedState: State = {
        ...initialState,
        isFocusSessionRunning: false,
      };
      const action = unPauseFocusSession({ idleTimeToAdd: 5000 });
      const state = focusModeReducer(pausedState, action);

      expect(state.isFocusSessionRunning).toBe(true);
    });
  });

  describe('showFocusOverlay', () => {
    it('should show overlay', () => {
      const action = showFocusOverlay();
      const state = focusModeReducer(initialState, action);

      expect(state.isFocusOverlayShown).toBe(true);
    });
  });

  describe('hideFocusOverlay', () => {
    it('should hide overlay and reset page if session done', () => {
      const stateWithOverlay: State = {
        ...initialState,
        isFocusOverlayShown: true,
        focusSessionActivePage: FocusModePage.SessionDone,
      };
      const action = hideFocusOverlay();
      const state = focusModeReducer(stateWithOverlay, action);

      expect(state.isFocusOverlayShown).toBe(false);
      expect(state.focusSessionActivePage).toBe(FocusModePage.TaskSelection);
    });

    it('should keep current page if not session done', () => {
      const stateWithOverlay: State = {
        ...initialState,
        isFocusOverlayShown: true,
        focusSessionActivePage: FocusModePage.Main,
      };
      const action = hideFocusOverlay();
      const state = focusModeReducer(stateWithOverlay, action);

      expect(state.isFocusOverlayShown).toBe(false);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Main);
    });
  });

  describe('cancelFocusSession', () => {
    it('should cancel and reset session', () => {
      const runningState: State = {
        ...initialState,
        isFocusOverlayShown: true,
        isFocusSessionRunning: true,
        focusSessionTimeElapsed: 10 * 60 * 1000,
        focusSessionDuration: 30 * 60 * 1000,
      };
      const action = cancelFocusSession();
      const state = focusModeReducer(runningState, action);

      expect(state.isFocusOverlayShown).toBe(false);
      expect(state.isFocusSessionRunning).toBe(false);
      expect(state.focusSessionTimeElapsed).toBe(0);
      expect(state.focusSessionDuration).toBe(25 * 60 * 1000);
    });
  });

  describe('startBreak', () => {
    it('should start short break', () => {
      const action = startBreak({ isLongBreak: false, breakDuration: 5 * 60 * 1000 });
      const state = focusModeReducer(initialState, action);

      expect(state.isBreak).toBe(true);
      expect(state.breakTimeElapsed).toBe(0);
      expect(state.breakDuration).toBe(5 * 60 * 1000);
      expect(state.isBreakLong).toBe(false);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Break);
    });

    it('should start long break', () => {
      const action = startBreak({ isLongBreak: true, breakDuration: 15 * 60 * 1000 });
      const state = focusModeReducer(initialState, action);

      expect(state.isBreak).toBe(true);
      expect(state.breakTimeElapsed).toBe(0);
      expect(state.breakDuration).toBe(15 * 60 * 1000);
      expect(state.isBreakLong).toBe(true);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Break);
    });
  });

  describe('setBreakTimeElapsed', () => {
    it('should update break time elapsed', () => {
      const breakState: State = {
        ...initialState,
        isBreak: true,
      };
      const timeElapsed = 2 * 60 * 1000;
      const action = setBreakTimeElapsed({ breakTimeElapsed: timeElapsed });
      const state = focusModeReducer(breakState, action);

      expect(state.breakTimeElapsed).toBe(timeElapsed);
    });
  });

  describe('skipBreak', () => {
    it('should end break and reset values', () => {
      const breakState: State = {
        ...initialState,
        isBreak: true,
        breakTimeElapsed: 2 * 60 * 1000,
        focusSessionActivePage: FocusModePage.Break,
        focusSessionTimeElapsed: 25 * 60 * 1000,
      };
      const action = skipBreak();
      const state = focusModeReducer(breakState, action);

      expect(state.isBreak).toBe(false);
      expect(state.breakTimeElapsed).toBe(0);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Main);
      expect(state.focusSessionTimeElapsed).toBe(0);
    });
  });

  describe('completeBreak', () => {
    it('should end break and reset values', () => {
      const breakState: State = {
        ...initialState,
        isBreak: true,
        breakTimeElapsed: 5 * 60 * 1000,
        focusSessionActivePage: FocusModePage.Break,
        focusSessionTimeElapsed: 25 * 60 * 1000,
      };
      const action = completeBreak();
      const state = focusModeReducer(breakState, action);

      expect(state.isBreak).toBe(false);
      expect(state.breakTimeElapsed).toBe(0);
      expect(state.focusSessionActivePage).toBe(FocusModePage.Main);
      expect(state.focusSessionTimeElapsed).toBe(0);
    });
  });

  describe('incrementCycle', () => {
    it('should increment cycle count', () => {
      const action = incrementCycle();
      const state = focusModeReducer(initialState, action);

      expect(state.currentCycle).toBe(2);
    });

    it('should increment from existing cycle count', () => {
      const stateWithCycles: State = {
        ...initialState,
        currentCycle: 3,
      };
      const action = incrementCycle();
      const state = focusModeReducer(stateWithCycles, action);

      expect(state.currentCycle).toBe(4);
    });
  });

  describe('resetCycles', () => {
    it('should reset cycle count to 1', () => {
      const stateWithCycles: State = {
        ...initialState,
        currentCycle: 5,
      };
      const action = resetCycles();
      const state = focusModeReducer(stateWithCycles, action);

      expect(state.currentCycle).toBe(1);
    });
  });
});
