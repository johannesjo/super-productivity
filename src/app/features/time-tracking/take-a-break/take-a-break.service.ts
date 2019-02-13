import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { combineLatest, from, merge, Observable, Subject, timer } from 'rxjs';
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
import { SnackService } from '../../../core/snack/snack.service';
import { ConfigService } from '../../config/config.service';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { IdleService } from '../idle.service';

const BREAK_TRIGGER_DURATION = 10 * 60 * 1000;

// required because typescript freaks out
const reduceBreak = (acc, tick) => {
  return acc + tick.duration;
};

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

  private isIdleResetEnabled$ = combineLatest(
    this._configService.misc$,
    this._chromeExtensionInterfaceService.isReady$,
  ).pipe(
    map(([cfg, isExtension]) =>
      cfg.isEnableIdleTimeTracking && cfg.isUnTrackedIdleResetsBreakTimer && isExtension
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

  private _triggerProgrammaticReset$: Observable<any> = this.isIdleResetEnabled$.pipe(
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
    // delay(1000),
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
    private _snackService: SnackService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
  ) {
    this._triggerManualReset$.subscribe(val => {
      console.log('MANUAL TAKE A BREAK RESET', val);
    });

    const RE_OPEN_SNACK_INTERVAL = 2 * 60 * 1000;
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
      throttleTime(RE_OPEN_SNACK_INTERVAL),
    ).subscribe(([timeWithoutBreak, cfg, isIdle]) => {
      console.log('timeWithoutBreak', timeWithoutBreak);
      const msg = this._createMessage(timeWithoutBreak, cfg);
      this._snackService.open({
        type: 'TAKE_A_BREAK',
        message: msg,
        config: {
          duration: RE_OPEN_SNACK_INTERVAL - 1000,
        }
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
