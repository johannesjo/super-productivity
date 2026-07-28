import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { Action } from '@ngrx/store';
import { TakeABreakService } from './take-a-break.service';
import { idleDialogResult } from '../idle/store/idle.actions';
import { IdleTrackItem } from '../idle/dialog-idle/dialog-idle.model';
import { TaskService } from '../tasks/task.service';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { IdleService } from '../idle/idle.service';
import { GlobalConfigService } from '../config/global-config.service';
import { NotifyService } from '../../core/notify/notify.service';
import { BannerService } from '../../core/banner/banner.service';
import { UiHelperService } from '../ui-helper/ui-helper.service';
import { SnackService } from '../../core/snack/snack.service';
import { LOCAL_ACTIONS } from '../../util/local-actions.token';
import { BannerId } from '../../core/banner/banner.model';
import { Tick } from '../../core/global-tracking-interval/tick.model';
import { T } from '../../t.const';

describe('TakeABreakService', () => {
  let service: TakeABreakService;
  let taskService: jasmine.SpyObj<TaskService>;
  let snackService: jasmine.SpyObj<SnackService>;
  let bannerService: jasmine.SpyObj<BannerService>;
  let actions$: Subject<Action>;
  let tick$: Subject<Tick>;
  let currentTaskId$: BehaviorSubject<string | null>;

  beforeEach(() => {
    actions$ = new Subject<Action>();
    tick$ = new Subject<Tick>();
    taskService = jasmine.createSpyObj<TaskService>('TaskService', [
      'pauseCurrent',
      'currentTaskId',
    ]);
    // `currentTaskId$` is read as a property during construction. It must be a
    // live subject, not `of(null)`: `of` completes, which makes it impossible to
    // exercise the untracked-stretch reset re-arming after a task is tracked.
    currentTaskId$ = new BehaviorSubject<string | null>(null);
    (taskService as unknown as { currentTaskId$: unknown }).currentTaskId$ =
      currentTaskId$;
    taskService.currentTaskId.and.returnValue(null);

    snackService = jasmine.createSpyObj<SnackService>('SnackService', ['open']);
    bannerService = jasmine.createSpyObj<BannerService>('BannerService', [
      'open',
      'dismiss',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TakeABreakService,
        { provide: TaskService, useValue: taskService },
        { provide: SnackService, useValue: snackService },
        { provide: BannerService, useValue: bannerService },
        { provide: LOCAL_ACTIONS, useValue: actions$ },
        { provide: GlobalTrackingIntervalService, useValue: { tick$: tick$ } },
        { provide: IdleService, useValue: { isIdle$: of(false) } },
        {
          provide: GlobalConfigService,
          useValue: {
            cfg$: of({
              takeABreak: { isTakeABreakEnabled: true },
              // idle tracking on is the shipped default, and it used to be the
              // configuration in which the automatic break-timer reset was dead
              idle: { isEnableIdleTimeTracking: true },
            }),
            takeABreak$: of({ isTakeABreakEnabled: true }),
            idle$: of({ isEnableIdleTimeTracking: true }),
            sound$: of({ breakReminderSound: null, volume: 0 }),
          },
        },
        { provide: NotifyService, useValue: { notifyDesktop: () => undefined } },
        {
          provide: UiHelperService,
          useValue: { focusAppAfterNotification: () => undefined },
        },
      ],
    });

    service = TestBed.inject(TakeABreakService);
  });

  describe('idle dialog result', () => {
    const IDLE_TIME = 5 * 60000;
    const BREAK_ITEM: IdleTrackItem = {
      type: 'BREAK',
      time: 'IDLE_TIME',
      simpleCounterToggleBtns: [],
    };
    // only SPLIT mode sends a resolved number; BREAK/TASK send the 'IDLE_TIME'
    // placeholder with the duration in the action's separate idleTime field
    const SPLIT_TASK_ITEM: IdleTrackItem = {
      type: 'TASK',
      time: 60000,
      title: 'Some task',
      simpleCounterToggleBtns: [],
    };

    const dialogResult = (
      trackItems: IdleTrackItem[],
      isResetBreakTimer: boolean,
    ): Action =>
      idleDialogResult({
        trackItems,
        isResetBreakTimer,
        wasFocusSessionRunning: false,
        idleTime: IDLE_TIME,
      });

    let emitted: number[];
    let sub: { unsubscribe: () => void };
    const current = (): number | undefined => emitted[emitted.length - 1];

    beforeEach(() => {
      emitted = [];
      sub = service.timeWorkingWithoutABreak$.subscribe((v) => emitted.push(v));
      // seed the working-without-a-break accumulator
      service.otherNoBreakTIme$.next(10000);
      expect(current()).toBe(10000);
    });

    afterEach(() => sub.unsubscribe());

    it('resets the timer when a reset was requested', () => {
      actions$.next(dialogResult([], true));
      expect(current()).toBe(0);
    });

    it('does not reset the timer when skipping without a reset request', () => {
      actions$.next(dialogResult([], false));
      expect(current()).toBe(10000);
    });

    it('does not reset the timer for a tracked break when the user opted out', () => {
      actions$.next(dialogResult([BREAK_ITEM], false));
      expect(current()).toBe(10000);
    });

    it('adds tracked task time but not break time when not resetting', () => {
      actions$.next(dialogResult([BREAK_ITEM, SPLIT_TASK_ITEM], false));
      expect(current()).toBe(10000 + 60000);
    });

    it('dismisses the reminder banner when the timer is reset', () => {
      actions$.next(dialogResult([], true));

      expect(bannerService.dismiss).toHaveBeenCalledTimes(1);
      expect(bannerService.dismiss).toHaveBeenCalledWith(BannerId.TakeABreak);
    });
  });

  describe('reminder teardown', () => {
    // The idle dialog used to reset the counter without reaching _triggerReset$,
    // so the banner stayed up and the lock-screen / fullscreen-blocker subjects
    // stayed latched at `true` for the rest of the session. (Focus-mode breaks
    // had the same problem; that one is guarded in focus-mode.effects.spec.ts,
    // since the routing lives in the effect.)
    it('dismisses the reminder when the idle dialog requests a reset', () => {
      const emitted: number[] = [];
      const sub = service.timeWorkingWithoutABreak$.subscribe((v) => emitted.push(v));
      service.otherNoBreakTIme$.next(10000);

      actions$.next(
        idleDialogResult({
          trackItems: [],
          isResetBreakTimer: true,
          wasFocusSessionRunning: false,
          idleTime: 60000,
        }),
      );

      expect(emitted[emitted.length - 1]).toBe(0);
      expect(bannerService.dismiss).toHaveBeenCalledWith(BannerId.TakeABreak);
      sub.unsubscribe();
    });

    it('tears down only once while nothing is being tracked', () => {
      const emitted: number[] = [];
      const sub = service.timeWorkingWithoutABreak$.subscribe((v) => emitted.push(v));

      // past BREAK_TRIGGER_DURATION, then many further ticks
      for (let i = 0; i < 15; i++) {
        tick$.next({ duration: 60000, date: '2026-07-28', timestamp: 0 });
      }

      expect(emitted[emitted.length - 1]).toBe(0);
      expect(bannerService.dismiss).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
    });

    // The edge trigger must re-arm, or the automatic reset degrades to
    // once-per-session — the same silent-death shape as the #9305 bug itself.
    it('re-arms after a task is tracked and stopped again', () => {
      const sub = service.timeWorkingWithoutABreak$.subscribe();
      const untrackedStretch = (): void => {
        for (let i = 0; i < 15; i++) {
          tick$.next({ duration: 60000, date: '2026-07-28', timestamp: 0 });
        }
      };

      untrackedStretch();
      expect(bannerService.dismiss).toHaveBeenCalledTimes(1);

      currentTaskId$.next('task-1');
      currentTaskId$.next(null);
      untrackedStretch();

      expect(bannerService.dismiss).toHaveBeenCalledTimes(2);
      sub.unsubscribe();
    });
  });

  describe('with idle tracking enabled', () => {
    it('counts a long stretch without a tracked task as a break', () => {
      const emitted: number[] = [];
      const sub = service.timeWorkingWithoutABreak$.subscribe((v) => emitted.push(v));
      service.otherNoBreakTIme$.next(10000);
      expect(emitted[emitted.length - 1]).toBe(10000);

      // more than BREAK_TRIGGER_DURATION with no current task selected
      tick$.next({ duration: 11 * 60000, date: '2026-07-28', timestamp: 0 });

      expect(emitted[emitted.length - 1]).toBe(0);
      sub.unsubscribe();
    });

    // Characterises the overlap between the two reset mechanisms: while the user
    // is away, the current task is already deselected, so the "long stretch with
    // no tracked task" reset fires during the absence -- before the idle dialog
    // is ever answered. Answering it with the reset checkbox explicitly UNCHECKED
    // therefore cannot preserve the pre-idle counter; it is already gone.
    it('lets the untracked-stretch reset win over an explicit opt-out in the idle dialog', () => {
      const emitted: number[] = [];
      const sub = service.timeWorkingWithoutABreak$.subscribe((v) => emitted.push(v));
      service.otherNoBreakTIme$.next(89 * 60000);
      expect(emitted[emitted.length - 1]).toBe(89 * 60000);

      // user goes idle -> handleIdleInit$ deselects the task -> ticks accumulate
      // as "no current task" for longer than BREAK_TRIGGER_DURATION
      tick$.next({ duration: 11 * 60000, date: '2026-07-28', timestamp: 0 });
      expect(emitted[emitted.length - 1]).toBe(0);

      // user returns and says "that was work on a task, do NOT reset my timer"
      actions$.next(
        idleDialogResult({
          trackItems: [
            {
              type: 'TASK',
              time: 'IDLE_TIME',
              title: 'Some task',
              simpleCounterToggleBtns: [],
            },
          ],
          isResetBreakTimer: false,
          wasFocusSessionRunning: false,
          idleTime: 11 * 60000,
        }),
      );

      expect(emitted[emitted.length - 1]).toBe(0);
      sub.unsubscribe();
    });
  });

  describe('startBreak()', () => {
    it('pauses tracking', () => {
      service.startBreak();
      expect(taskService.pauseCurrent).toHaveBeenCalledTimes(1);
    });

    it('shows an encouraging snack so the click clearly does something', () => {
      service.startBreak();

      expect(snackService.open).toHaveBeenCalledTimes(1);
      expect(snackService.open).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'SUCCESS',
          msg: T.F.TIME_TRACKING.B.BREAK_SNACK,
        }),
      );
    });

    it('dismisses the reminder banner', () => {
      service.startBreak();
      expect(bannerService.dismiss).toHaveBeenCalledTimes(1);
      expect(bannerService.dismiss).toHaveBeenCalledWith(BannerId.TakeABreak);
    });
  });
});
