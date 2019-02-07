import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { EMPTY, merge, Observable, Subject } from 'rxjs';
import { filter, map, mapTo, scan, shareReplay, switchMap, tap, throttleTime, withLatestFrom } from 'rxjs/operators';
import { SnackService } from '../../../core/snack/snack.service';
import { ConfigService } from '../../config/config.service';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';
import { IdleService } from '../idle.service';

const BREAK_TRIGGER_DURATION = 10 * 60 * 1000;

// required because typescript freaks out
const reduceBreak = (acc, [tick, currentTaskId]) => {
  return currentTaskId ? 0 : acc + tick.duration;
};

@Injectable({
  providedIn: 'root',
})
export class TakeABreakService {
  // TODO improve
  private _timeWithNoCurrentTask$: Observable<number> = this._timeTrackingService.tick$.pipe(
    withLatestFrom(
      this._taskService.currentTaskId$,
    ),
    scan(reduceBreak, 0),
    shareReplay(),
  );

  // TODO refactor to be triggered by config and extension rather than interval
  private _triggerSimpleBreakReset$: Observable<any> = this._timeWithNoCurrentTask$.pipe(
    filter(timeWithNoTask => timeWithNoTask > BREAK_TRIGGER_DURATION),
    withLatestFrom(
      this._configService.cfg$,
      this._chromeExtensionInterfaceService.isReady$,
    ),
    // only use break if normal idle time is not used for break handling
    filter(([t, cfg, isExtension]) =>
      !cfg.misc.isEnableIdleTimeTracking || !isExtension || !cfg.misc.isUnTrackedIdleResetsBreakTimer),
  );

  private _tick$: Observable<number> = this._timeTrackingService.tick$.pipe(
    map(tick => tick.duration),
  );

  private _triggerIdleReset$: Observable<any> = this._configService.cfg$.pipe(
    tap((cfg) => console.log(cfg.misc)),
    switchMap((cfg) => {
      return cfg.misc.isUnTrackedIdleResetsBreakTimer
        ? this._idleService.wasLastSessionTracked$
        : EMPTY;
    }),
    filter(wasTracked => !wasTracked)
  );

  private _triggerManualReset$ = new Subject<number>();

  private _triggerReset$: Observable<number> = merge(
    // this._triggerSimpleBreakReset$,
    this._triggerIdleReset$,
    // this._triggerManualReset$,
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
    // this.timeWorkingWithoutABreak$.subscribe(val => {
    //   console.log('timeWorkingWithoutABreak$', val);
    // });
    // this._timeWithNoCurrentTask$.subscribe(val => {
    //   console.log('_timeWithNoCurrentTask$', val);
    // });
    this._triggerIdleReset$.subscribe(val => {
      console.log('_triggerIdleReset$', val);
    });

    const DIALOG_DISPLAY_DURATION = 60 * 1000;
    this.timeWorkingWithoutABreak$.pipe(
      throttleTime(5 * 1000),
      // throttleTime(DIALOG_DISPLAY_DURATION),
      withLatestFrom(this._configService.cfg$),
      filter(([timeWithoutBreak, cfg]) =>
        cfg.misc && cfg.misc.isTakeABreakEnabled && timeWithoutBreak > cfg.misc.takeABreakMinWorkingTime),
    ).subscribe(([timeWithoutBreak, cfg]) => {
      console.log(timeWithoutBreak);
      const msg = this._createMessage(timeWithoutBreak, cfg);
      this._snackService.open({
        message: msg,
        icon: 'free_breakfast',
        actionStr: 'I already did',
        config: {duration: DIALOG_DISPLAY_DURATION},
        actionFn: () => {
          this._triggerManualReset$.next(0);
        }
      });
    });
  }

  private _createMessage(duration, cfg) {
    if (cfg && cfg.misc.takeABreakMessage) {
      const durationStr = msToString(duration);
      return cfg.misc.takeABreakMessage
        .replace(/\$\{duration\}/gi, durationStr);
    }
  }
}
