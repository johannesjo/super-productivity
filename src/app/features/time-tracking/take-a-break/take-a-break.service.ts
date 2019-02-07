import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { combineLatest, from, merge, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, mapTo, scan, shareReplay, switchMap, throttleTime, withLatestFrom } from 'rxjs/operators';
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

  private _triggerProgrammaticReset$: Observable<any> = this.isIdleResetEnabled$.pipe(
    switchMap((isIdleResetEnabled) => {
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
    // this._timeWithNoCurrentTask$.subscribe(val => {
    //   console.log('_timeWithNoCurrentTask$', val);
    // });

    const RE_CHECK_DIALOG_INTERVAL = 30 * 1000;
    this.timeWorkingWithoutABreak$.pipe(
      withLatestFrom(this._configService.misc$, this._idleService.isIdle$),
      filter(([timeWithoutBreak, cfg, isIdle]) =>
        cfg && cfg.isTakeABreakEnabled
        && timeWithoutBreak > cfg.takeABreakMinWorkingTime
        // we don't wanna show if idle to avoid conflicts with the idle modal
        && (!isIdle || !cfg.isEnableIdleTimeTracking),
      ),
      // throttleTime(5 * 1000),
      throttleTime(RE_CHECK_DIALOG_INTERVAL),
    ).subscribe(([timeWithoutBreak, cfg, isIdle]) => {
      console.log('timeWithoutBreak', timeWithoutBreak);
      const msg = this._createMessage(timeWithoutBreak, cfg);
      this._snackService.open({
        message: msg,
        icon: 'free_breakfast',
        actionStr: 'I already did',
        config: {duration: RE_CHECK_DIALOG_INTERVAL},
        actionFn: () => {
          this._triggerManualReset$.next(0);
        }
      });
    });
  }

  private _createMessage(duration, cfg) {
    if (cfg && cfg.takeABreakMessage) {
      const durationStr = msToString(duration);
      return cfg.takeABreakMessage
        .replace(/\$\{duration\}/gi, durationStr);
    }
  }
}
