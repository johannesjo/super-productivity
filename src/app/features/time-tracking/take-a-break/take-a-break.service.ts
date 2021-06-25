import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { EMPTY, from, merge, Observable, of, Subject, timer } from 'rxjs';
import {
  delay,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  scan,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { IdleService } from '../idle.service';
import { IS_ELECTRON } from '../../../app.constants';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { GlobalConfigState, TakeABreakConfig } from '../../config/global-config.model';
import { T } from '../../../t.const';
import { IPC } from '../../../../../electron/ipc-events.const';
import { NotifyService } from '../../../core/notify/notify.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { UiHelperService } from '../../ui-helper/ui-helper.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { Tick } from '../time-tracking';
import { ipcRenderer } from 'electron';

const BREAK_TRIGGER_DURATION = 10 * 60 * 1000;
const PING_UPDATE_BANNER_INTERVAL = 60 * 1000;
const DESKTOP_NOTIFICATION_THROTTLE = 5 * 60 * 1000;
const LOCK_SCREEN_THROTTLE = 5 * 60 * 1000;
const LOCK_SCREEN_DELAY = 30 * 1000;

// required because typescript freaks out
const reduceBreak = (acc: number, tick: Tick) => {
  return acc + tick.duration;
};

const BANNER_ID: BannerId = BannerId.TakeABreak;

@Injectable({
  providedIn: 'root',
})
export class TakeABreakService {
  private _timeWithNoCurrentTask$: Observable<number> =
    this._taskService.currentTaskId$.pipe(
      switchMap((currentId) => {
        return currentId
          ? from([0])
          : this._timeTrackingService.tick$.pipe(scan(reduceBreak, 0));
      }),
      shareReplay(1),
    );

  private _isIdleResetEnabled$: Observable<boolean> = this._configService.idle$.pipe(
    switchMap((idleCfg) => {
      const isConfigured =
        idleCfg.isEnableIdleTimeTracking && idleCfg.isUnTrackedIdleResetsBreakTimer;
      if (IS_ELECTRON) {
        return [isConfigured];
      } else if (isConfigured) {
        return this._chromeExtensionInterfaceService.isReady$;
      } else {
        return [false];
      }
    }),
    distinctUntilChanged(),
  );

  private _triggerSimpleBreakReset$: Observable<any> = this._timeWithNoCurrentTask$.pipe(
    filter((timeWithNoTask) => timeWithNoTask > BREAK_TRIGGER_DURATION),
  );

  private _tick$: Observable<number> = this._timeTrackingService.tick$.pipe(
    map((tick) => tick.duration),
  );

  private _triggerSnooze$: Subject<number> = new Subject();
  private _snoozeActive$: Observable<boolean> = this._triggerSnooze$.pipe(
    startWith(false),
    switchMap((val: boolean | number) => {
      if (val === false) {
        return [false];
      } else {
        return timer(+val).pipe(mapTo(false), startWith(true));
      }
    }),
  );

  private _triggerProgrammaticReset$: Observable<any> = this._isIdleResetEnabled$.pipe(
    switchMap((isIdleResetEnabled) => {
      return isIdleResetEnabled
        ? this._idleService.triggerResetBreakTimer$
        : this._triggerSimpleBreakReset$;
    }),
  );

  private _triggerManualReset$: Subject<number> = new Subject<number>();

  private _triggerReset$: Observable<number> = merge(
    this._triggerProgrammaticReset$,
    this._triggerManualReset$,
  ).pipe(mapTo(0));

  timeWorkingWithoutABreak$: Observable<number> = merge(
    this._tick$,
    this._triggerReset$,
    // of(9999999).pipe(delay(4000)),
  ).pipe(
    scan((acc, value) => {
      return value > 0 ? acc + value : value;
    }),
    shareReplay(1),
  );

  private _triggerLockScreenCounter$: Subject<boolean> = new Subject();
  private _triggerLockScreenThrottledAndDelayed$: Observable<unknown | never> =
    this._triggerLockScreenCounter$.pipe(
      filter(() => IS_ELECTRON),
      distinctUntilChanged(),
      switchMap((v) =>
        !!v
          ? of(v).pipe(throttleTime(LOCK_SCREEN_THROTTLE), delay(LOCK_SCREEN_DELAY))
          : EMPTY,
      ),
    );

  private _triggerBanner$: Observable<[number, GlobalConfigState, boolean, boolean]> =
    this.timeWorkingWithoutABreak$.pipe(
      withLatestFrom(
        this._configService.cfg$,
        this._idleService.isIdle$,
        this._snoozeActive$,
      ),
      filter(
        ([timeWithoutBreak, cfg, isIdle, isSnoozeActive]: [
          number,
          GlobalConfigState,
          boolean,
          boolean,
        ]): boolean =>
          cfg &&
          cfg.takeABreak &&
          cfg.takeABreak.isTakeABreakEnabled &&
          !isSnoozeActive &&
          timeWithoutBreak > cfg.takeABreak.takeABreakMinWorkingTime &&
          // we don't wanna show if idle to avoid conflicts with the idle modal
          (!isIdle || !cfg.idle.isEnableIdleTimeTracking),
      ),
      // throttleTime(5 * 1000),
      throttleTime(PING_UPDATE_BANNER_INTERVAL),
    );

  private _triggerDesktopNotification$: Observable<
    [number, GlobalConfigState, boolean, boolean]
  > = this._triggerBanner$.pipe(throttleTime(DESKTOP_NOTIFICATION_THROTTLE));

  constructor(
    private _taskService: TaskService,
    private _timeTrackingService: TimeTrackingService,
    private _idleService: IdleService,
    private _configService: GlobalConfigService,
    private _workContextService: WorkContextService,
    private _electronService: ElectronService,
    private _notifyService: NotifyService,
    private _bannerService: BannerService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _uiHelperService: UiHelperService,
  ) {
    this._triggerReset$
      .pipe(
        withLatestFrom(this._configService.takeABreak$),
        filter(([reset, cfg]) => cfg && cfg.isTakeABreakEnabled),
      )
      .subscribe(() => {
        this._bannerService.dismiss(BANNER_ID);
      });

    this._triggerLockScreenThrottledAndDelayed$.subscribe(() => {
      if (IS_ELECTRON) {
        (this._electronService.ipcRenderer as typeof ipcRenderer).send(IPC.LOCK_SCREEN);
      }
    });

    this._triggerDesktopNotification$.subscribe(([timeWithoutBreak, cfg]) => {
      const msg = this._createMessage(timeWithoutBreak, cfg.takeABreak);
      this._notifyService.notifyDesktop({
        title: msg,
      });
    });

    this._triggerBanner$.subscribe(([timeWithoutBreak, cfg]) => {
      const msg: string = this._createMessage(timeWithoutBreak, cfg.takeABreak) as string;
      if (IS_ELECTRON && cfg.takeABreak.isLockScreen) {
        this._triggerLockScreenCounter$.next(true);
      }
      if (IS_ELECTRON && cfg.takeABreak.isFocusWindow) {
        this._uiHelperService.focusApp();
      }

      this._bannerService.open({
        id: BANNER_ID,
        ico: 'free_breakfast',
        msg,
        translateParams: {
          time: msToString(cfg.takeABreak.takeABreakSnoozeTime),
        },
        action: {
          label: T.F.TIME_TRACKING.B.ALREADY_DID,
          fn: () => this.resetTimerAndCountAsBreak(),
        },
        action2: {
          label: T.F.TIME_TRACKING.B.SNOOZE,
          fn: () => this.snooze(cfg.takeABreak.takeABreakSnoozeTime),
        },
        img: cfg.takeABreak.motivationalImg || undefined,
      });
    });
  }

  snooze(snoozeTime: number = 15 * 60 * 1000) {
    this._triggerSnooze$.next(snoozeTime);
    this._triggerLockScreenCounter$.next(false);
  }

  resetTimer() {
    this._triggerManualReset$.next(0);
  }

  resetTimerAndCountAsBreak() {
    const min5 = 1000 * 60 * 5;
    this._workContextService.addToBreakTimeForActiveContext(undefined, min5);
    this.resetTimer();

    this._triggerLockScreenCounter$.next(false);
  }

  private _createMessage(duration: number, cfg: TakeABreakConfig): string | undefined {
    if (cfg && cfg.takeABreakMessage) {
      const durationStr = msToString(duration);
      return cfg.takeABreakMessage.replace(/\$\{duration\}/gi, durationStr);
    }
    return undefined;
  }
}
