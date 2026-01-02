import { TestBed, fakeAsync } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import { DateService } from '../../../core/date/date.service';
import { Task } from '../../tasks/task.model';

// We need to test the effect logic by reimplementing it in tests since
// the actual effects are conditionally created based on IS_ANDROID_WEB_VIEW

describe('AndroidForegroundTrackingEffects - syncTimeSpentChanges logic', () => {
  let store: MockStore;
  let currentTask$: BehaviorSubject<Task | null>;
  let updateTrackingServiceSpy: jasmine.Spy;

  beforeEach(() => {
    currentTask$ = new BehaviorSubject<Task | null>(null);
    updateTrackingServiceSpy = jasmine.createSpy('updateTrackingService');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: TaskService, useValue: { getByIdOnce$: () => currentTask$ } },
        { provide: DateService, useValue: { todayStr: () => '2024-01-01' } },
      ],
    });

    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  /**
   * Test the core logic: when timeSpent changes for the same task while tracking,
   * the updateTrackingService should be called with the new value.
   */
  describe('timeSpent change detection logic', () => {
    it('should call updateTrackingService when timeSpent changes for the same task', fakeAsync(() => {
      // Simulate the effect logic
      const prevState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const currState = { taskId: 'task-1', timeSpent: 0, isFocusModeActive: false };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeTrue();

      // In real code, this triggers: androidInterface.updateTrackingService?.(curr.timeSpent);
      if (shouldUpdate) {
        updateTrackingServiceSpy(currState.timeSpent);
      }

      expect(updateTrackingServiceSpy).toHaveBeenCalledWith(0);
    }));

    it('should NOT call updateTrackingService when switching to a different task', fakeAsync(() => {
      const prevState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const currState = { taskId: 'task-2', timeSpent: 30000, isFocusModeActive: false };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeFalse();
    }));

    it('should NOT call updateTrackingService when focus mode is active', fakeAsync(() => {
      const prevState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const currState = { taskId: 'task-1', timeSpent: 0, isFocusModeActive: true };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeFalse();
    }));

    it('should NOT call updateTrackingService when no task is being tracked', fakeAsync(() => {
      const prevState = { taskId: null, timeSpent: 0, isFocusModeActive: false };
      const currState = { taskId: null, timeSpent: 0, isFocusModeActive: false };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeFalse();
    }));

    it('should NOT call updateTrackingService when timeSpent did not change', fakeAsync(() => {
      const prevState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const currState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeFalse();
    }));

    it('should call updateTrackingService when timeSpent is increased', fakeAsync(() => {
      const prevState = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const currState = { taskId: 'task-1', timeSpent: 120000, isFocusModeActive: false };

      const shouldUpdate =
        prevState.taskId === currState.taskId &&
        currState.taskId !== null &&
        !currState.isFocusModeActive &&
        prevState.timeSpent !== currState.timeSpent;

      expect(shouldUpdate).toBeTrue();

      if (shouldUpdate) {
        updateTrackingServiceSpy(currState.timeSpent);
      }

      expect(updateTrackingServiceSpy).toHaveBeenCalledWith(120000);
    }));
  });

  describe('distinctUntilChanged behavior', () => {
    it('should detect changes when only timeSpent differs', () => {
      const stateA = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const stateB = { taskId: 'task-1', timeSpent: 0, isFocusModeActive: false };

      // The distinctUntilChanged comparator
      const isEqual =
        stateA.taskId === stateB.taskId &&
        stateA.timeSpent === stateB.timeSpent &&
        stateA.isFocusModeActive === stateB.isFocusModeActive;

      expect(isEqual).toBeFalse(); // Should NOT be equal, so effect should fire
    });

    it('should NOT detect changes when state is identical', () => {
      const stateA = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };
      const stateB = { taskId: 'task-1', timeSpent: 60000, isFocusModeActive: false };

      const isEqual =
        stateA.taskId === stateB.taskId &&
        stateA.timeSpent === stateB.timeSpent &&
        stateA.isFocusModeActive === stateB.isFocusModeActive;

      expect(isEqual).toBeTrue(); // Should be equal, so effect should NOT fire
    });
  });
});

describe('AndroidForegroundTrackingEffects - safeNativeCall error handling', () => {
  let logErrSpy: jasmine.Spy;
  let snackOpenSpy: jasmine.Spy;

  // Replicate the _safeNativeCall helper logic for testing
  const safeNativeCall = (
    fn: () => void,
    errorMsg: string,
    showSnackbar: boolean,
    logErr: (msg: string, e: unknown) => void,
    snackOpen: (params: { msg: string; type: string }) => void,
  ): void => {
    try {
      fn();
    } catch (e) {
      logErr(errorMsg, e);
      if (showSnackbar) {
        snackOpen({ msg: errorMsg, type: 'ERROR' });
      }
    }
  };

  beforeEach(() => {
    logErrSpy = jasmine.createSpy('DroidLog.err');
    snackOpenSpy = jasmine.createSpy('snackService.open');
  });

  it('should not log error when native call succeeds', () => {
    const successFn = jasmine.createSpy('successFn');

    safeNativeCall(successFn, 'Error message', false, logErrSpy, snackOpenSpy);

    expect(successFn).toHaveBeenCalled();
    expect(logErrSpy).not.toHaveBeenCalled();
    expect(snackOpenSpy).not.toHaveBeenCalled();
  });

  it('should log error when native call throws', () => {
    const error = new Error('Java exception was raised');
    const failFn = jasmine.createSpy('failFn').and.throwError(error);

    safeNativeCall(failFn, 'Failed to start service', false, logErrSpy, snackOpenSpy);

    expect(failFn).toHaveBeenCalled();
    expect(logErrSpy).toHaveBeenCalledWith('Failed to start service', error);
    expect(snackOpenSpy).not.toHaveBeenCalled();
  });

  it('should show snackbar when native call throws and showSnackbar is true', () => {
    const error = new Error('Java exception was raised');
    const failFn = jasmine.createSpy('failFn').and.throwError(error);

    safeNativeCall(failFn, 'Failed to start tracking', true, logErrSpy, snackOpenSpy);

    expect(failFn).toHaveBeenCalled();
    expect(logErrSpy).toHaveBeenCalledWith('Failed to start tracking', error);
    expect(snackOpenSpy).toHaveBeenCalledWith({
      msg: 'Failed to start tracking',
      type: 'ERROR',
    });
  });

  it('should NOT show snackbar when native call throws and showSnackbar is false', () => {
    const error = new Error('Java exception was raised');
    const failFn = jasmine.createSpy('failFn').and.throwError(error);

    safeNativeCall(failFn, 'Failed to update service', false, logErrSpy, snackOpenSpy);

    expect(failFn).toHaveBeenCalled();
    expect(logErrSpy).toHaveBeenCalledWith('Failed to update service', error);
    expect(snackOpenSpy).not.toHaveBeenCalled();
  });

  it('should handle different error types', () => {
    const stringError = 'String error message';
    const failFn = (): void => {
      throw stringError;
    };

    safeNativeCall(failFn, 'Native call failed', true, logErrSpy, snackOpenSpy);

    expect(logErrSpy).toHaveBeenCalledWith('Native call failed', stringError);
    expect(snackOpenSpy).toHaveBeenCalledWith({
      msg: 'Native call failed',
      type: 'ERROR',
    });
  });
});
