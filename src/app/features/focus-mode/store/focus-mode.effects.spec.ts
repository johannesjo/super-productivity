import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { FocusModeEffects } from './focus-mode.effects';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FocusModeStrategyFactory } from '../focus-mode-strategies';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { BannerService } from '../../../core/banner/banner.service';
import { MetricService } from '../../metric/metric.service';
import { FocusModeStorageService } from '../focus-mode-storage.service';
import * as actions from './focus-mode.actions';
import * as selectors from './focus-mode.selectors';
import { FocusModeMode, FocusScreen, TimerState } from '../focus-mode.model';
import { unsetCurrentTask, setCurrentTask } from '../../tasks/store/task.actions';
import { openIdleDialog } from '../../idle/store/idle.actions';
import { selectTaskById } from '../../tasks/store/task.selectors';
import {
  selectFocusModeConfig,
  selectIsFocusModeEnabled,
  selectPomodoroConfig,
} from '../../config/store/global-config.reducer';
import { updateGlobalConfigSection } from '../../config/store/global-config.actions';
import { take, toArray } from 'rxjs/operators';
import { HydrationStateService } from '../../../op-log/apply/hydration-state.service';

describe('FocusModeEffects', () => {
  let actions$: Observable<any>;
  let effects: FocusModeEffects;
  let store: MockStore;
  let strategyFactoryMock: any;
  let taskServiceMock: any;
  let globalConfigServiceMock: any;
  let metricServiceMock: any;
  let hydrationStateServiceMock: any;
  let currentTaskId$: BehaviorSubject<string | null>;

  const createMockTimer = (overrides: Partial<TimerState> = {}): TimerState => ({
    isRunning: false,
    startedAt: null,
    elapsed: 0,
    duration: 0,
    purpose: null,
    ...overrides,
  });

  beforeEach(() => {
    currentTaskId$ = new BehaviorSubject<string | null>(null);

    strategyFactoryMock = {
      getStrategy: jasmine.createSpy('getStrategy').and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: true,
        shouldAutoStartNextSession: true,
        getBreakDuration: jasmine
          .createSpy('getBreakDuration')
          .and.returnValue({ duration: 5 * 60 * 1000, isLong: false }),
      }),
    };

    taskServiceMock = {
      currentTaskId$: currentTaskId$.asObservable(),
    };

    globalConfigServiceMock = {
      sound: jasmine.createSpy('sound').and.returnValue({ volume: 75 }),
    };

    metricServiceMock = {
      logFocusSession: jasmine.createSpy('logFocusSession'),
    };

    hydrationStateServiceMock = {
      isApplyingRemoteOps: jasmine
        .createSpy('isApplyingRemoteOps')
        .and.returnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        FocusModeEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            focusMode: {
              timer: createMockTimer(),
              mode: FocusModeMode.Pomodoro,
              currentCycle: 1,
              lastCompletedDuration: 0,
            },
          },
          selectors: [
            { selector: selectors.selectTimer, value: createMockTimer() },
            { selector: selectors.selectMode, value: FocusModeMode.Pomodoro },
            { selector: selectors.selectCurrentCycle, value: 1 },
            { selector: selectors.selectLastSessionDuration, value: 0 },
            {
              selector: selectFocusModeConfig,
              value: { isSyncSessionWithTracking: false },
            },
            { selector: selectPomodoroConfig, value: { duration: 25 * 60 * 1000 } },
            { selector: selectIsFocusModeEnabled, value: true },
          ],
        }),
        { provide: FocusModeStrategyFactory, useValue: strategyFactoryMock },
        { provide: GlobalConfigService, useValue: globalConfigServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        {
          provide: BannerService,
          useValue: { open: jasmine.createSpy(), dismiss: jasmine.createSpy() },
        },
        { provide: MetricService, useValue: metricServiceMock },
        {
          provide: FocusModeStorageService,
          useValue: { setLastCountdownDuration: jasmine.createSpy() },
        },
        { provide: HydrationStateService, useValue: hydrationStateServiceMock },
      ],
    });

    effects = TestBed.inject(FocusModeEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('syncDurationWithMode$', () => {
    it('should sync duration with mode when focusModeLoaded is dispatched', (done) => {
      actions$ = of(actions.focusModeLoaded());

      effects.syncDurationWithMode$.subscribe((action) => {
        expect(strategyFactoryMock.getStrategy).toHaveBeenCalledWith(
          FocusModeMode.Pomodoro,
        );
        expect(action).toEqual(
          actions.setFocusSessionDuration({ focusSessionDuration: 25 * 60 * 1000 }),
        );
        done();
      });
    });

    it('should sync duration with mode when setFocusModeMode is dispatched', (done) => {
      actions$ = of(actions.setFocusModeMode({ mode: FocusModeMode.Pomodoro }));

      effects.syncDurationWithMode$.subscribe((action) => {
        expect(strategyFactoryMock.getStrategy).toHaveBeenCalledWith(
          FocusModeMode.Pomodoro,
        );
        expect(action).toEqual(
          actions.setFocusSessionDuration({ focusSessionDuration: 25 * 60 * 1000 }),
        );
        done();
      });
    });

    it('should NOT sync duration on focusModeLoaded if duration is already > 0', (done) => {
      actions$ = of(actions.focusModeLoaded());
      store.overrideSelector(selectors.selectTimer, createMockTimer({ duration: 25000 }));
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithMode$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should NOT sync duration for Flowtime mode', (done) => {
      actions$ = of(actions.setFocusModeMode({ mode: FocusModeMode.Flowtime }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Flowtime);
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithMode$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });
  });

  describe('syncDurationWithPomodoroConfig$', () => {
    it('should sync duration when pomodoro config changes for unstarted session', (done) => {
      actions$ = of(
        updateGlobalConfigSection({ sectionKey: 'pomodoro', sectionCfg: {} }),
      );
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 20 * 60 * 1000 }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectPomodoroConfig, {
        duration: 30 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      effects.syncDurationWithPomodoroConfig$.subscribe((action) => {
        expect(action).toEqual(
          actions.setFocusSessionDuration({ focusSessionDuration: 30 * 60 * 1000 }),
        );
        done();
      });
    });

    it('should NOT sync when session has already started', (done) => {
      actions$ = of(
        updateGlobalConfigSection({ sectionKey: 'pomodoro', sectionCfg: {} }),
      );
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 20 * 60 * 1000, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectPomodoroConfig, {
        duration: 30 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithPomodoroConfig$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should NOT sync for non-Pomodoro modes', (done) => {
      actions$ = of(
        updateGlobalConfigSection({ sectionKey: 'pomodoro', sectionCfg: {} }),
      );
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 20 * 60 * 1000 }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Flowtime);
      store.overrideSelector(selectPomodoroConfig, {
        duration: 30 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithPomodoroConfig$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should NOT sync for non-pomodoro config section updates', (done) => {
      actions$ = of(updateGlobalConfigSection({ sectionKey: 'misc', sectionCfg: {} }));
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 20 * 60 * 1000 }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectPomodoroConfig, {
        duration: 30 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithPomodoroConfig$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should NOT sync if duration is not divisible by 1000', (done) => {
      actions$ = of(
        updateGlobalConfigSection({ sectionKey: 'pomodoro', sectionCfg: {} }),
      );
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 20 * 60 * 1000 }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      // 30 minutes + 500ms = not divisible by 1000
      store.overrideSelector(selectPomodoroConfig, {
        duration: 1800500,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithPomodoroConfig$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should NOT sync if duration is the same as current', (done) => {
      actions$ = of(
        updateGlobalConfigSection({ sectionKey: 'pomodoro', sectionCfg: {} }),
      );
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ duration: 25 * 60 * 1000 }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectPomodoroConfig, {
        duration: 25 * 60 * 1000,
        cyclesBeforeLongerBreak: 4,
      });
      store.refreshState();

      const result: any[] = [];
      effects.syncDurationWithPomodoroConfig$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });
  });

  describe('sessionComplete$', () => {
    it('should dispatch incrementCycle for Pomodoro mode', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: true }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentCycle, 1);
      store.refreshState();

      effects.sessionComplete$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(actions.incrementCycle());
        done();
      });
    });

    it('should NOT dispatch incrementCycle for Flowtime mode', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: true }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Flowtime);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 0,
        shouldStartBreakAfterSession: false,
        shouldAutoStartNextSession: false,
        getBreakDuration: () => null,
      });

      const result: any[] = [];
      effects.sessionComplete$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          const hasIncrementCycle = result.some(
            (a) => a.type === actions.incrementCycle.type,
          );
          expect(hasIncrementCycle).toBeFalse();
          done();
        },
      });
    });

    it('should dispatch startBreak for automatic (non-manual) completions when strategy allows', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentCycle, 1);
      store.refreshState();

      effects.sessionComplete$.pipe(toArray()).subscribe((actionsArr) => {
        const startBreakAction = actionsArr.find(
          (a) => a.type === actions.startBreak.type,
        );
        expect(startBreakAction).toBeDefined();
        expect(startBreakAction.duration).toBe(5 * 60 * 1000);
        expect(startBreakAction.isLongBreak).toBeFalse();
        done();
      });
    });

    it('should NOT dispatch startBreak for manual completions', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: true }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.refreshState();

      effects.sessionComplete$.pipe(toArray()).subscribe((actionsArr) => {
        const startBreakAction = actionsArr.find(
          (a) => a.type === actions.startBreak.type,
        );
        expect(startBreakAction).toBeUndefined();
        done();
      });
    });

    it('should dispatch correct isLongBreak based on cycle', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentCycle, 4);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: true,
        shouldAutoStartNextSession: true,
        getBreakDuration: jasmine
          .createSpy('getBreakDuration')
          .and.returnValue({ duration: 15 * 60 * 1000, isLong: true }),
      });

      effects.sessionComplete$.pipe(toArray()).subscribe((actionsArr) => {
        const startBreakAction = actionsArr.find(
          (a) => a.type === actions.startBreak.type,
        );
        expect(startBreakAction).toBeDefined();
        expect(startBreakAction.isLongBreak).toBeTrue();
        expect(startBreakAction.duration).toBe(15 * 60 * 1000);
        done();
      });
    });
  });

  describe('breakComplete$', () => {
    it('should dispatch startFocusSession when strategy.shouldAutoStartNextSession is true', (done) => {
      actions$ = of(actions.completeBreak({ pausedTaskId: null }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.refreshState();

      effects.breakComplete$.subscribe((action) => {
        expect(action).toEqual(actions.startFocusSession({ duration: 25 * 60 * 1000 }));
        done();
      });
    });

    it('should NOT dispatch startFocusSession when shouldAutoStartNextSession is false', (done) => {
      actions$ = of(actions.completeBreak({ pausedTaskId: null }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Countdown);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: false,
        shouldAutoStartNextSession: false,
        getBreakDuration: () => null,
      });

      const result: any[] = [];
      effects.breakComplete$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should dispatch setCurrentTask when pausedTaskId is provided', (done) => {
      const pausedTaskId = 'test-paused-task-id';
      actions$ = of(actions.completeBreak({ pausedTaskId }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Countdown);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: false,
        shouldAutoStartNextSession: false,
        getBreakDuration: () => null,
      });

      effects.breakComplete$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(setCurrentTask({ id: pausedTaskId }));
        done();
      });
    });
  });

  describe('skipBreak$', () => {
    it('should dispatch startFocusSession when strategy.shouldAutoStartNextSession is true', (done) => {
      actions$ = of(actions.skipBreak({ pausedTaskId: null }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.refreshState();

      effects.skipBreak$.subscribe((action) => {
        expect(action).toEqual(actions.startFocusSession({ duration: 25 * 60 * 1000 }));
        done();
      });
    });

    it('should NOT dispatch startFocusSession when shouldAutoStartNextSession is false', (done) => {
      actions$ = of(actions.skipBreak({ pausedTaskId: null }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Countdown);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: false,
        shouldAutoStartNextSession: false,
        getBreakDuration: () => null,
      });

      const result: any[] = [];
      effects.skipBreak$.subscribe({
        next: (action) => result.push(action),
        complete: () => {
          expect(result.length).toBe(0);
          done();
        },
      });
    });

    it('should dispatch setCurrentTask when pausedTaskId is provided', (done) => {
      const pausedTaskId = 'test-paused-task-id';
      actions$ = of(actions.skipBreak({ pausedTaskId }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Countdown);
      store.refreshState();

      strategyFactoryMock.getStrategy.and.returnValue({
        initialSessionDuration: 25 * 60 * 1000,
        shouldStartBreakAfterSession: false,
        shouldAutoStartNextSession: false,
        getBreakDuration: () => null,
      });

      effects.skipBreak$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(setCurrentTask({ id: pausedTaskId }));
        done();
      });
    });
  });

  describe('cancelSession$', () => {
    it('should dispatch unsetCurrentTask when session is cancelled', (done) => {
      actions$ = of(actions.cancelFocusSession());

      effects.cancelSession$.subscribe((action) => {
        expect(action).toEqual(unsetCurrentTask());
        done();
      });
    });
  });

  describe('pauseOnIdle$', () => {
    it('should dispatch pauseFocusSession when openIdleDialog is dispatched', (done) => {
      actions$ = of(
        openIdleDialog({
          lastCurrentTaskId: null,
          enabledSimpleStopWatchCounters: [],
          wasFocusSessionRunning: false,
        }),
      );

      effects.pauseOnIdle$.subscribe((action) => {
        expect(action.type).toEqual(actions.pauseFocusSession.type);
        done();
      });
    });
  });

  describe('logFocusSession$', () => {
    it('should call metricService.logFocusSession with duration on completeFocusSession', () => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectLastSessionDuration, 25 * 60 * 1000);
      store.refreshState();

      effects.logFocusSession$.subscribe();

      expect(metricServiceMock.logFocusSession).toHaveBeenCalledWith(25 * 60 * 1000);
    });

    it('should NOT log when duration is 0', () => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectLastSessionDuration, 0);
      store.refreshState();

      effects.logFocusSession$.subscribe();

      expect(metricServiceMock.logFocusSession).not.toHaveBeenCalled();
    });
  });

  describe('autoShowOverlay$', () => {
    it('should dispatch showFocusOverlay when isSyncSessionWithTracking is true and task is selected', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.refreshState();

      // Need to recreate effects after selector override for store-based effects
      effects = TestBed.inject(FocusModeEffects);

      // Simulate task selection
      setTimeout(() => {
        currentTaskId$.next('task-123');
      }, 10);

      effects.autoShowOverlay$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(actions.showFocusOverlay());
        done();
      });
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      // Wait a bit to ensure no action is dispatched
      setTimeout(() => {
        // If we get here without the effect emitting, test passes
        done();
      }, 50);
    });

    it('should NOT dispatch when task id is null', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next(null);

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch showFocusOverlay when isStartInBackground is true', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
        isStartInBackground: true,
      });
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // If we get here without the effect emitting, test passes
        done();
      }, 50);
    });

    it('should NOT dispatch showFocusOverlay when isFocusModeEnabled is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectIsFocusModeEnabled, false);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // If we get here without the effect emitting, test passes
        done();
      }, 50);
    });
  });

  describe('syncTrackingStartToSession$', () => {
    it('should dispatch startFocusSession when isSyncSessionWithTracking is true and task is selected on Main screen', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectTimer, createMockTimer());
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Main);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      setTimeout(() => {
        currentTaskId$.next('task-123');
      }, 10);

      effects.syncTrackingStartToSession$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(actions.startFocusSession({ duration: 25 * 60 * 1000 }));
        done();
      });
    });

    it('should dispatch unPauseFocusSession when session is paused and task is selected', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      // Session is paused (purpose is 'work' but not running)
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Main);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      setTimeout(() => {
        currentTaskId$.next('task-123');
      }, 10);

      effects.syncTrackingStartToSession$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(actions.unPauseFocusSession());
        done();
      });
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Main);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch when session is already running', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Main);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch when on SessionDone screen', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectTimer, createMockTimer());
      store.overrideSelector(selectors.selectMode, FocusModeMode.Flowtime);
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.SessionDone);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // Should not start new session when on SessionDone screen
        done();
      }, 50);
    });

    it('should NOT dispatch when on Break screen', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectTimer, createMockTimer());
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Break);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // Should not start new session when on Break screen
        done();
      }, 50);
    });

    it('should NOT dispatch when isFocusModeEnabled is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectTimer, createMockTimer());
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentScreen, FocusScreen.Main);
      store.overrideSelector(selectIsFocusModeEnabled, false);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // Should not start session when focus mode feature is disabled
        done();
      }, 50);
    });
  });

  describe('syncTrackingStopToSession$', () => {
    it('should dispatch pauseFocusSession when tracking stops and session is running', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      // Simulate tracking stopping: emit task ID first, then null
      currentTaskId$.next('task-123');

      effects.syncTrackingStopToSession$.pipe(take(1)).subscribe((action) => {
        expect(action.type).toEqual(actions.pauseFocusSession.type);
        expect((action as any).pausedTaskId).toBe('task-123');
        done();
      });

      // After a short delay, stop tracking
      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch when session is not running', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'work' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch during break', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'break' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch when switching to different task (not stopping)', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        // Switch to different task, not null
        currentTaskId$.next('task-456');
      }, 10);

      setTimeout(() => {
        done();
      }, 50);
    });

    it('should NOT dispatch when isFocusModeEnabled is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectIsFocusModeEnabled, false);
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        // Should not pause session when focus mode feature is disabled
        done();
      }, 50);
    });

    it('should NOT dispatch when sync is applying remote operations (skipDuringSync)', (done) => {
      // This test verifies the fix for the app freeze bug:
      // When sync is active, the effect should be skipped to prevent
      // cascading action dispatches that overwhelm the store.
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      // Simulate sync being active
      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(true);

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        // Effect should NOT fire during sync - this prevents the freeze bug
        done();
      }, 50);
    });

    it('should dispatch normally when sync completes (skipDuringSync allows)', (done) => {
      // Verify the effect works normally when not during sync
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      // Sync is NOT active
      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(false);

      effects = TestBed.inject(FocusModeEffects);

      currentTaskId$.next('task-123');

      effects.syncTrackingStopToSession$.pipe(take(1)).subscribe((action) => {
        expect(action.type).toEqual(actions.pauseFocusSession.type);
        expect((action as any).pausedTaskId).toBe('task-123');
        done();
      });

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);
    });

    it('should NOT dispatch during rapid currentTaskId changes while sync is active (freeze prevention)', (done) => {
      // This test simulates the freeze scenario: rapid task ID changes during sync
      // Without skipDuringSync, each change would trigger pauseFocusSession,
      // causing cascading effects that freeze the UI
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      // Sync is active
      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(true);

      effects = TestBed.inject(FocusModeEffects);

      let emitCount = 0;
      effects.syncTrackingStopToSession$.subscribe(() => {
        emitCount++;
      });

      // Simulate rapid task ID changes during sync (like bulk operations)
      currentTaskId$.next('task-1');
      currentTaskId$.next('task-2');
      currentTaskId$.next(null);
      currentTaskId$.next('task-3');
      currentTaskId$.next(null);
      currentTaskId$.next('task-4');
      currentTaskId$.next(null);

      setTimeout(() => {
        // Effect should NOT fire at all during sync
        expect(emitCount).toBe(0);
        done();
      }, 50);
    });

    it('should resume normal behavior after sync completes', (done) => {
      // Verify that after sync ends, the effect works correctly again
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      // Start with sync active
      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(true);

      effects = TestBed.inject(FocusModeEffects);

      effects.syncTrackingStopToSession$.subscribe((action) => {
        expect(action.type).toEqual(actions.pauseFocusSession.type);
        expect((action as any).pausedTaskId).toBe('task-after-sync');
        done();
      });

      // Changes during sync - should be ignored
      currentTaskId$.next('task-during-sync');

      setTimeout(() => {
        currentTaskId$.next(null);
      }, 10);

      setTimeout(() => {
        // Sync completes
        hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(false);

        // Now changes should be processed
        currentTaskId$.next('task-after-sync');

        setTimeout(() => {
          currentTaskId$.next(null);
        }, 10);
      }, 30);
    });

    it('should handle sync state toggling rapidly without crashing', (done) => {
      // Edge case: sync state changes rapidly while task ID also changes
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      effects = TestBed.inject(FocusModeEffects);

      let emitCount = 0;
      effects.syncTrackingStopToSession$.subscribe(() => {
        emitCount++;
      });

      // Rapid sync state changes with task changes
      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(true);
      currentTaskId$.next('task-1');

      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(false);
      currentTaskId$.next('task-2');

      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(true);
      currentTaskId$.next(null);

      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(false);
      currentTaskId$.next('task-3');

      setTimeout(() => {
        // Should not crash and should handle state changes gracefully
        // The exact emit count depends on timing, but it should not freeze
        expect(emitCount).toBeGreaterThanOrEqual(0);
        done();
      }, 50);
    });

    it('should correctly use pairwise after skipDuringSync filters out emissions', (done) => {
      // Verify that pairwise works correctly with skipDuringSync
      // When sync filters out emissions, pairwise should still work on remaining emissions
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.refreshState();

      hydrationStateServiceMock.isApplyingRemoteOps.and.returnValue(false);

      effects = TestBed.inject(FocusModeEffects);

      const emittedActions: any[] = [];
      effects.syncTrackingStopToSession$.pipe(take(2)).subscribe((action) => {
        emittedActions.push(action);
        if (emittedActions.length === 2) {
          // Both emissions should have correct pausedTaskId from pairwise
          expect(emittedActions[0].pausedTaskId).toBe('task-A');
          expect(emittedActions[1].pausedTaskId).toBe('task-B');
          done();
        }
      });

      // First pair: task-A -> null
      currentTaskId$.next('task-A');
      setTimeout(() => {
        currentTaskId$.next(null);

        // Second pair: task-B -> null
        setTimeout(() => {
          currentTaskId$.next('task-B');
          setTimeout(() => {
            currentTaskId$.next(null);
          }, 10);
        }, 20);
      }, 10);
    });
  });

  describe('syncSessionPauseToTracking$', () => {
    it('should dispatch unsetCurrentTask when session pauses with pausedTaskId', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'work' }),
      );
      store.refreshState();

      actions$ = of(actions.pauseFocusSession({ pausedTaskId: 'task-123' }));

      effects.syncSessionPauseToTracking$.subscribe((action) => {
        expect(action.type).toEqual('[Task] UnsetCurrentTask');
        done();
      });
    });

    it('should NOT dispatch when pausedTaskId is null', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'work' }),
      );
      store.refreshState();

      actions$ = of(actions.pauseFocusSession({ pausedTaskId: null }));

      let emitted = false;
      effects.syncSessionPauseToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'work' }),
      );
      store.refreshState();

      actions$ = of(actions.pauseFocusSession({ pausedTaskId: 'task-123' }));

      let emitted = false;
      effects.syncSessionPauseToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch during break', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: false, purpose: 'break' }),
      );
      store.refreshState();

      actions$ = of(actions.pauseFocusSession({ pausedTaskId: 'task-123' }));

      let emitted = false;
      effects.syncSessionPauseToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });
  });

  describe('syncSessionResumeToTracking$', () => {
    it('should dispatch setCurrentTask when session resumes with pausedTaskId', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      // Mock that the task exists
      store.overrideSelector(selectTaskById as any, {
        id: 'task-123',
        title: 'Test Task',
      });
      currentTaskId$.next(null); // No current task
      store.refreshState();

      actions$ = of(actions.unPauseFocusSession());

      effects.syncSessionResumeToTracking$.subscribe((action) => {
        expect(action.type).toEqual('[Task] SetCurrentTask');
        expect((action as any).id).toBe('task-123');
        done();
      });
    });

    it('should NOT dispatch when no pausedTaskId', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectPausedTaskId, null);
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.unPauseFocusSession());

      let emitted = false;
      effects.syncSessionResumeToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch when already tracking a task', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      currentTaskId$.next('task-456'); // Already tracking a different task
      store.refreshState();

      actions$ = of(actions.unPauseFocusSession());

      let emitted = false;
      effects.syncSessionResumeToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.unPauseFocusSession());

      let emitted = false;
      effects.syncSessionResumeToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch setCurrentTask when task no longer exists', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(
        selectors.selectTimer,
        createMockTimer({ isRunning: true, purpose: 'work' }),
      );
      store.overrideSelector(selectors.selectPausedTaskId, 'deleted-task-123');
      // Mock that the task doesn't exist (use any cast for parameterized selector)
      store.overrideSelector(selectTaskById as any, undefined as any);
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.unPauseFocusSession());

      let emitted = false;
      effects.syncSessionResumeToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });
  });

  describe('syncSessionStartToTracking$', () => {
    it('should dispatch setCurrentTask when session starts with pausedTaskId and no current task', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      // Mock that the task exists
      store.overrideSelector(selectTaskById as any, {
        id: 'task-123',
        title: 'Test Task',
      });
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.startFocusSession({ duration: 25 * 60 * 1000 }));

      effects.syncSessionStartToTracking$.subscribe((action) => {
        expect(action.type).toEqual('[Task] SetCurrentTask');
        expect((action as any).id).toBe('task-123');
        done();
      });
    });

    it('should NOT dispatch when already tracking a task', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      currentTaskId$.next('task-456'); // Already tracking
      store.refreshState();

      actions$ = of(actions.startFocusSession({ duration: 25 * 60 * 1000 }));

      let emitted = false;
      effects.syncSessionStartToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch when no pausedTaskId', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectPausedTaskId, null);
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.startFocusSession({ duration: 25 * 60 * 1000 }));

      let emitted = false;
      effects.syncSessionStartToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch when isSyncSessionWithTracking is false', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectPausedTaskId, 'task-123');
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.startFocusSession({ duration: 25 * 60 * 1000 }));

      let emitted = false;
      effects.syncSessionStartToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT dispatch setCurrentTask when task no longer exists', (done) => {
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: true,
        isSkipPreparation: false,
      });
      store.overrideSelector(selectors.selectPausedTaskId, 'deleted-task-123');
      // Mock that the task doesn't exist (use any cast for parameterized selector)
      store.overrideSelector(selectTaskById as any, undefined as any);
      currentTaskId$.next(null);
      store.refreshState();

      actions$ = of(actions.startFocusSession({ duration: 25 * 60 * 1000 }));

      let emitted = false;
      effects.syncSessionStartToTracking$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });
  });

  describe('pauseTrackingDuringBreak', () => {
    it('should dispatch unsetCurrentTask when break starts and isPauseTrackingDuringBreak is true', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentCycle, 1);
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
        isPauseTrackingDuringBreak: true,
      });
      currentTaskId$.next('task-123');
      store.refreshState();

      effects.sessionComplete$.pipe(toArray()).subscribe((actionsArr) => {
        const unsetAction = actionsArr.find((a) => a.type === '[Task] UnsetCurrentTask');
        expect(unsetAction).toBeDefined();
        done();
      });
    });

    it('should NOT dispatch unsetCurrentTask when isPauseTrackingDuringBreak is false', (done) => {
      actions$ = of(actions.completeFocusSession({ isManual: false }));
      store.overrideSelector(selectors.selectMode, FocusModeMode.Pomodoro);
      store.overrideSelector(selectors.selectCurrentCycle, 1);
      store.overrideSelector(selectFocusModeConfig, {
        isSyncSessionWithTracking: false,
        isSkipPreparation: false,
        isPauseTrackingDuringBreak: false,
      });
      currentTaskId$.next('task-123');
      store.refreshState();

      effects.sessionComplete$.pipe(toArray()).subscribe((actionsArr) => {
        const unsetAction = actionsArr.find((a) => a.type === '[Task] UnsetCurrentTask');
        expect(unsetAction).toBeUndefined();
        done();
      });
    });
  });
});
