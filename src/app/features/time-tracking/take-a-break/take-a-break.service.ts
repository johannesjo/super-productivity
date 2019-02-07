import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { merge, Observable } from 'rxjs';
import { filter, map, mapTo, scan, shareReplay, throttleTime, withLatestFrom } from 'rxjs/operators';
import { SnackService } from '../../../core/snack/snack.service';
import { ConfigService } from '../../config/config.service';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { ChromeExtensionInterfaceService } from '../../../core/chrome-extension-interface/chrome-extension-interface.service';

const BREAK_TRIGGER_DURATION = 5 * 60 * 1000;

// required because typescript freaks out
const reduceBreak = (acc, [tick, currentTaskId]) => {
  return currentTaskId ? 0 : acc + tick.duration;
};

@Injectable({
  providedIn: 'root',
})
export class TakeABreakService {
  /* tslint:disable*/
  private _timeWithNoTask$: Observable<number> = this._timeTrackingService.tick$.pipe(
    withLatestFrom(
      this._taskService.currentTaskId$,
    ),
    scan(reduceBreak, 0),
    shareReplay(),
  );

  private _triggerBreakReset$: Observable<number> = this._timeWithNoTask$.pipe(
    filter(timeWithNoTask => timeWithNoTask > BREAK_TRIGGER_DURATION),
    withLatestFrom(
      this._configService.cfg$,
      this._chromeExtensionInterfaceService.isReady$,
    ),
    // only use break if normal idle time is not used for break handling
    filter(([t, cfg, isExtension]) =>
      !cfg.misc.isEnableIdleTimeTracking || !isExtension),
    mapTo(0),
  );

  private _tick$: Observable<number> = this._timeTrackingService.tick$.pipe(
    map(tick => tick.duration),
  );

  private _resetValues$: Observable<number> = this._triggerBreakReset$;

  timeWorkingWithoutABreak$: Observable<number> = merge(
    this._tick$,
    this._resetValues$,
  ).pipe(
    scan((acc, value) => {
      return (value > 0)
        ? acc + value
        : value;
    }),
    shareReplay(),
  );


  private timeWorkedWithoutABreakAcc = 0;
  private timeWorkedWithoutABreakLastOverZero = 0;
  private isBlockByIdle = false;

  constructor(
    private _taskService: TaskService,
    private _timeTrackingService: TimeTrackingService,
    private _configService: ConfigService,
    private _snackService: SnackService,
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
  ) {
    this.timeWorkingWithoutABreak$.subscribe(val => {
      if (!this.isBlockByIdle) {
        this.timeWorkedWithoutABreakAcc = val;
        if (val > 0) {
          this.timeWorkedWithoutABreakLastOverZero = val;
        }
      }
    });

    this.timeWorkingWithoutABreak$.pipe(
      throttleTime(60 * 1000),
      // .pipe(throttleTime(5 * 1000))
      withLatestFrom(this._configService.cfg$),
      filter(([timeWithoutBreak, cfg]) =>
        cfg.misc && cfg.misc.isTakeABreakEnabled && timeWithoutBreak > cfg.misc.takeABreakMinWorkingTime),
      map(([timeWithoutBreak, cfg]) => timeWithoutBreak),
    ).subscribe(timeWithoutBreak => {
      console.log(timeWithoutBreak);
      const msg = this._getMessage(timeWithoutBreak);
      this._snackService.open({
        message: msg,
        icon: 'free_breakfast',
        actionStr: 'I already did',
        config: {duration: 60 * 1000},
        actionFn: () => {
          this.timeWorkedWithoutABreakLastOverZero = 0;
          this.timeWorkedWithoutABreakAcc = 0;
        }
      });
    });
  }

  blockByIdle(initialidleTime) {
    if (this.isBlockByIdle) {
      throw new Error('blockByIdle should not be called twice');
    }
    console.log('blockByIdle', initialidleTime, this.timeWorkedWithoutABreakLastOverZero);
    this.isBlockByIdle = true;
    this.timeWorkedWithoutABreakLastOverZero -= initialidleTime;
    if (this.timeWorkedWithoutABreakLastOverZero < 0) {
      this.timeWorkedWithoutABreakLastOverZero = 0;
    }
  }

  reset() {
    this.timeWorkedWithoutABreakAcc = 0;
    this.isBlockByIdle = false;
  }

  continue(valToAdd: number) {
    console.log('continue', valToAdd, this.timeWorkedWithoutABreakLastOverZero);
    this.timeWorkedWithoutABreakAcc = this.timeWorkedWithoutABreakLastOverZero + valToAdd;
    this.isBlockByIdle = false;
  }

  private _getMessage(duration) {
    if (this._configService.cfg && this._configService.cfg.misc.takeABreakMessage) {
      const durationStr = msToString(duration);
      return this._configService.cfg.misc.takeABreakMessage
        .replace(/\$\{duration\}/gi, durationStr);
    }
  }
}
