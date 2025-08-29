import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, ReplaySubject } from 'rxjs';
import { FocusModeEffects } from './focus-mode.effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import {
  cancelFocusSession,
  pauseFocusSession,
  setFocusModeMode,
} from './focus-mode.actions';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { IdleService } from '../../idle/idle.service';
import { FocusModeService } from '../focus-mode.service';
import { unsetCurrentTask } from '../../tasks/store/task.actions';
import { openIdleDialog } from '../../idle/store/idle.actions';
import { FocusModeMode } from '../focus-mode.const';
import { Action } from '@ngrx/store';

describe('FocusModeEffects', () => {
  let effects: FocusModeEffects;
  let actions$: ReplaySubject<Action>;

  beforeEach(() => {
    actions$ = new ReplaySubject<Action>(1);

    const globalConfigServiceSpy = jasmine.createSpyObj('GlobalConfigService', [], {
      sound$: of({ volume: 0 }),
      pomodoroConfig$: of({
        duration: 25 * 60 * 1000,
        breakDuration: 5 * 60 * 1000,
        longerBreakDuration: 15 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
        isPlaySound: false,
        isPlaySoundAfterBreak: false,
      }),
    });

    const taskServiceSpy = jasmine.createSpyObj('TaskService', [], {
      currentTaskId$: of(null),
    });

    const idleServiceSpy = jasmine.createSpyObj('IdleService', [], {
      isIdle$: of(false),
    });

    const focusModeServiceSpy = jasmine.createSpyObj('FocusModeService', [], {
      currentSessionTime$: of(0),
      timeToGo$: of(25 * 60 * 1000),
      sessionProgress$: of(0),
      currentBreakTime$: of(0),
      breakTimeToGo$: of(5 * 60 * 1000),
      breakProgress$: of(0),
    });

    TestBed.configureTestingModule({
      providers: [
        FocusModeEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            focusMode: {
              isFocusSessionRunning: false,
              focusSessionDuration: 25 * 60 * 1000,
              mode: FocusModeMode.Flowtime,
            },
            globalConfig: {
              focusMode: {
                isAlwaysUseFocusMode: false,
              },
            },
          },
        }),
        { provide: GlobalConfigService, useValue: globalConfigServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: IdleService, useValue: idleServiceSpy },
        { provide: FocusModeService, useValue: focusModeServiceSpy },
      ],
    });

    effects = TestBed.inject(FocusModeEffects);
    TestBed.inject(MockStore); // Store initialized but not used in tests
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });

  describe('stopTrackingOnOnCancel$', () => {
    it('should unset current task when session is cancelled', (done) => {
      actions$.next(cancelFocusSession());

      effects.stopTrackingOnOnCancel$.subscribe((action) => {
        expect(action).toEqual(unsetCurrentTask());
        done();
      });
    });
  });

  describe('pauseOnIdle$', () => {
    it('should pause session when idle dialog opens', (done) => {
      actions$.next(
        openIdleDialog({
          lastCurrentTaskId: 'task-1',
          enabledSimpleStopWatchCounters: [],
          wasFocusSessionRunning: true,
        }),
      );

      effects.pauseOnIdle$.subscribe((action) => {
        expect(action).toEqual(pauseFocusSession());
        done();
      });
    });
  });

  describe('modeToLS$', () => {
    it('should save mode to localStorage', (done) => {
      const newMode = FocusModeMode.Pomodoro;
      spyOn(localStorage, 'setItem');

      actions$.next(setFocusModeMode({ mode: newMode }));

      effects.modeToLS$.subscribe(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('FOCUS_MODE_MODE', newMode);
        done();
      });
    });
  });

  describe('Break-related effects', () => {
    it('should be properly configured', () => {
      // Test that the break-related effects are available
      expect(effects.startBreakAfterPomodoro$).toBeDefined();
      expect(effects.updateBreakTimer$).toBeDefined();
      expect(effects.continueAfterBreak$).toBeDefined();
    });
  });
});
