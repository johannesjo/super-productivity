import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { Action } from '@ngrx/store';
import { IdleEffects } from './idle.effects';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DataInitStateService } from '../../../core/data-init/data-init-state.service';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
import { MatDialog } from '@angular/material/dialog';
import { UiHelperService } from '../../ui-helper/ui-helper.service';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { DateService } from '../../../core/date/date.service';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { IPC } from '../../../../../electron/shared-with-frontend/ipc-events.const';
import { selectIdleConfig } from '../../config/store/global-config.reducer';
import { selectIsSessionRunning } from '../../focus-mode/store/focus-mode.selectors';
import { selectIdleTime, selectIsIdle } from './idle.selectors';
import { openIdleDialog, triggerIdle } from './idle.actions';
import { HydrationStateService } from '../../../op-log/apply/hydration-state.service';

describe('IdleEffects', () => {
  let effects: IdleEffects;
  let actions$: Subject<Action>;
  let store: MockStore;
  let chromeInterfaceMock: {
    onReady$: Subject<void>;
    addEventListener: jasmine.Spy;
  };
  let idleCallback: ((ev: Event, data?: unknown) => void) | null;

  const setup = (overrides?: {
    isSuppressIdleDuringFocusMode?: boolean;
    isFocusSessionRunning?: boolean;
  }): void => {
    idleCallback = null;
    const isSuppress = overrides?.isSuppressIdleDuringFocusMode ?? false;
    const isSessionRunning = overrides?.isFocusSessionRunning ?? false;

    actions$ = new Subject<Action>();
    const onReady$ = new ReplaySubject<void>(1);
    chromeInterfaceMock = {
      onReady$,
      addEventListener: jasmine
        .createSpy('addEventListener')
        .and.callFake((event: string, cb: (ev: Event, data?: unknown) => void) => {
          if (event === IPC.IDLE_TIME) {
            idleCallback = cb;
          }
        }),
    };

    const dataInitStateMock = {
      isAllDataLoadedInitially$: new BehaviorSubject<boolean>(true),
    };

    const taskServiceMock = {
      currentTaskId: jasmine.createSpy('currentTaskId').and.returnValue('task-1'),
      removeTimeSpent: jasmine.createSpy('removeTimeSpent'),
      setCurrentId: jasmine.createSpy('setCurrentId'),
    };

    TestBed.configureTestingModule({
      providers: [
        IdleEffects,
        provideMockActions(() => actions$),
        { provide: LOCAL_ACTIONS, useValue: actions$ },
        provideMockStore({
          selectors: [
            {
              selector: selectIdleConfig,
              value: {
                isEnableIdleTimeTracking: true,
                isSuppressIdleDuringFocusMode: isSuppress,
                isOnlyOpenIdleWhenCurrentTask: false,
                minIdleTime: 60000,
              },
            },
            { selector: selectIsSessionRunning, value: isSessionRunning },
            { selector: selectIsIdle, value: false },
            { selector: selectIdleTime, value: 0 },
          ],
        }),
        { provide: DataInitStateService, useValue: dataInitStateMock },
        { provide: ChromeExtensionInterfaceService, useValue: chromeInterfaceMock },
        { provide: WorkContextService, useValue: {} as any },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: MatDialog, useValue: {} as any },
        { provide: UiHelperService, useValue: {} as any },
        {
          provide: SimpleCounterService,
          useValue: { enabledSimpleStopWatchCounters$: new BehaviorSubject([]) },
        },
        {
          provide: DateService,
          useValue: { todayStr: () => '2026-07-13' },
        },
      ],
    });

    effects = TestBed.inject(IdleEffects);
    store = TestBed.inject(MockStore);

    // Emit ready signal so _triggerIdleApis$ subscribes to the inner listener.
    // ReplaySubject replays the value even though the effect hasn't subscribed yet.
    onReady$.next();
    onReady$.complete();
  };

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('triggerIdleWhenEnabled$', () => {
    it('should suppress idle when isSuppressIdleDuringFocusMode is true and a work session is running', (done) => {
      setup({ isSuppressIdleDuringFocusMode: true, isFocusSessionRunning: true });

      const emitted: unknown[] = [];
      const sub = effects.triggerIdleWhenEnabled$.subscribe({
        next: (action) => emitted.push(action),
        error: (err) => {
          sub.unsubscribe();
          done.fail(err);
        },
      });

      // Fire idle time above minIdleTime (60000ms)
      if (idleCallback) {
        idleCallback(null as unknown as Event, 120000);
      }

      setTimeout(() => {
        sub.unsubscribe();
        expect(emitted.length).toBe(0);
        done();
      }, 200);
    });

    it('should NOT suppress idle when isSuppressIdleDuringFocusMode is true but no session is running', (done) => {
      setup({ isSuppressIdleDuringFocusMode: true, isFocusSessionRunning: false });

      const emitted: unknown[] = [];
      const sub = effects.triggerIdleWhenEnabled$.subscribe({
        next: (action) => emitted.push(action),
        error: (err) => {
          sub.unsubscribe();
          done.fail(err);
        },
      });

      if (idleCallback) {
        idleCallback(null as unknown as Event, 120000);
      }

      setTimeout(() => {
        sub.unsubscribe();
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toEqual(triggerIdle({ idleTime: 120000 }));
        done();
      }, 200);
    });

    it('should NOT suppress idle when isSuppressIdleDuringFocusMode is false even if session is running', (done) => {
      setup({ isSuppressIdleDuringFocusMode: false, isFocusSessionRunning: true });

      const emitted: unknown[] = [];
      const sub = effects.triggerIdleWhenEnabled$.subscribe({
        next: (action) => emitted.push(action),
        error: (err) => {
          sub.unsubscribe();
          done.fail(err);
        },
      });

      if (idleCallback) {
        idleCallback(null as unknown as Event, 120000);
      }

      setTimeout(() => {
        sub.unsubscribe();
        expect(emitted.length).toBe(1);
        expect(emitted[0]).toEqual(triggerIdle({ idleTime: 120000 }));
        done();
      }, 200);
    });
  });

  describe('handleIdleInit$', () => {
    // #9348: selectIsIdle emits `true` exactly once per idle episode. Dropping
    // that single edge (rather than deferring it) loses the side effects for
    // good AND leaves the store stuck at isIdle:true, which makes every later
    // idle tick short-circuit on isAlreadyIdle - idle handling is then dead
    // for the whole session.
    let emitted: Action[];
    let sub: { unsubscribe: () => void };

    const listen = (): void => {
      emitted = [];
      sub = effects.handleIdleInit$.subscribe((a) => emitted.push(a));
    };

    const goIdle = (): void => {
      store.overrideSelector(selectIsIdle, true);
      store.refreshState();
      TestBed.flushEffects();
    };

    afterEach(() => {
      sub?.unsubscribe();
      // the effect starts a 1s poll interval; stop it so it cannot dispatch
      // into a torn-down TestBed
      (effects as unknown as { _cancelIdlePoll: () => void })._cancelIdlePoll();
    });

    it('opens the idle dialog when nothing is being applied', () => {
      setup();
      listen();

      goIdle();

      expect(emitted.length).toBe(1);
      expect(emitted[0].type).toBe(openIdleDialog.type);
    });

    it('defers - not drops - the idle side effects when the edge lands inside a sync apply window', () => {
      setup();
      const hydrationState = TestBed.inject(HydrationStateService);
      listen();

      hydrationState.startApplyingRemoteOps();
      goIdle();

      // still held: the mutations must not run mid-apply
      expect(emitted.length).toBe(0);

      hydrationState.endApplyingRemoteOps();
      TestBed.flushEffects();

      // ...but they must not be lost either
      expect(emitted.length).toBe(1);
      expect(emitted[0].type).toBe(openIdleDialog.type);
    });
  });
});
