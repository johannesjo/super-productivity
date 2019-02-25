import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { from, merge, Observable, Subject, timer } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  scan,
  shareReplay,
  startWith,
  switchMap,
  throttleTime,
  withLatestFrom
} from 'rxjs/operators';
import { ConfigService } from '../../config/config.service';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { IdleService } from '../idle.service';
import { IS_ELECTRON } from '../../../app.constants';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';

const BREAK_TRIGGER_DURATION = 10 * 60 * 1000;

// required because typescript freaks out
const reduceBreak = (acc, tick) => {
  return acc + tick.duration;
};

const BANNER_ID: BannerId = 'TAKE_A_BREAK';

@Injectable({
  providedIn: 'root',
})
export class TakeABreakService {
  private _timeWithNoCurrentTask$: Observable<number> = this._taskService.currentTaskId$.pipe(
    switchMap((currentId) => {
      return currentId
        ? from([0])
        : this._timeTrackingService.tick$.pipe(scan(reduceBreak, 0));
    }),
    shareReplay(),
  );

  private _isIdleResetEnabled$ = this._configService.misc$.pipe(
    switchMap((cfg) => {
        const isConfigured = (cfg.isEnableIdleTimeTracking && cfg.isUnTrackedIdleResetsBreakTimer);
        if (IS_ELECTRON) {
          return [isConfigured];
        } else if (isConfigured) {
          return this._chromeExtensionInterfaceService.isReady$;
        } else {
          return [false];
        }
      }
    ),
    distinctUntilChanged(),
  );

  private _triggerSimpleBreakReset$: Observable<any> = this._timeWithNoCurrentTask$.pipe(
    filter(timeWithNoTask => timeWithNoTask > BREAK_TRIGGER_DURATION),
  );

  private _tick$: Observable<number> = this._timeTrackingService.tick$.pipe(
    map(tick => tick.duration),
  );

  private _triggerSnooze$ = new Subject<number>();
  private _snoozeActive$: Observable<boolean> = this._triggerSnooze$.pipe(
    startWith(false),
    switchMap((val: boolean | number) => {
      if (val === false) {
        return [false];
      } else {
        return timer(+val).pipe(
          mapTo(false),
          startWith(true),
        );
      }
    }),
  );

  private _triggerProgrammaticReset$: Observable<any> = this._isIdleResetEnabled$.pipe(
    switchMap((isIdleResetEnabled) => {
      console.log('PROGRAMMATIC Take a break – using Idle:', isIdleResetEnabled);
      return isIdleResetEnabled
        ? this._idleService.triggerResetBreakTimer$
        : this._triggerSimpleBreakReset$;
    }),
  );

  private _triggerManualReset$ = new Subject<number>();

  private _triggerReset$: Observable<number> = merge(
    this._triggerProgrammaticReset$,
    this._triggerManualReset$,
  ).pipe(
    mapTo(0),
  );

  timeWorkingWithoutABreak$: Observable<number> = merge(
    this._tick$,
    this._triggerReset$,
  ).pipe(
    // startWith(9999999),
    // delay(4000),
    scan((acc, value) => {
      return (value > 0)
        ? acc + value
        : value;
    }),
    shareReplay(),
  );


  constructor(
    private _taskService: TaskService,
    private _timeTrackingService: TimeTrackingService,
    private _idleService: IdleService,
    private _configService: ConfigService,
    private _bannerService: BannerService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
  ) {
    this._triggerReset$.pipe(
      withLatestFrom(this._configService.misc$),
      filter(([reset, cfg]) => cfg && cfg.isTakeABreakEnabled),
    ).subscribe(() => {
      this._bannerService.dismiss(BANNER_ID);
    });

    const PING_UPDATE_BANNER_INTERVAL = 60 * 1000;
    this.timeWorkingWithoutABreak$.pipe(
      withLatestFrom(
        this._configService.misc$,
        this._idleService.isIdle$,
        this._snoozeActive$,
      ),
      filter(([timeWithoutBreak, cfg, isIdle, isSnoozeActive]) =>
        cfg && cfg.isTakeABreakEnabled
        && !isSnoozeActive
        && (timeWithoutBreak > cfg.takeABreakMinWorkingTime)
        // we don't wanna show if idle to avoid conflicts with the idle modal
        && (!isIdle || !cfg.isEnableIdleTimeTracking)
      ),
      // throttleTime(5 * 1000),
      throttleTime(PING_UPDATE_BANNER_INTERVAL),
    ).subscribe(([timeWithoutBreak, cfg, isIdle]) => {
      console.log('timeWithoutBreak', timeWithoutBreak);
      const msg = this._createMessage(timeWithoutBreak, cfg);
      this._bannerService.open({
        id: BANNER_ID,
        ico: 'free_breakfast',
        msg,
        action: {
          label: 'I already did',
          fn: () => this.resetTimer()
        },
        action2: {
          label: 'Snooze 15m',
          fn: () => this.snooze()
        },
      });
    });
  }

  snooze(snoozeTime = 15 * 60 * 1000) {
    this._triggerSnooze$.next(snoozeTime);
  }

  resetTimer() {
    this._triggerManualReset$.next(0);
  }

  private _createMessage(duration, cfg) {
    if (cfg && cfg.takeABreakMessage) {
      const durationStr = msToString(duration);
      return cfg.takeABreakMessage
        .replace(/\$\{duration\}/gi, durationStr);
    }
  }
}
