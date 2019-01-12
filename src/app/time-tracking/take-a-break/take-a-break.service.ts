import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { Observable } from 'rxjs';
import { distinctUntilChanged, scan, throttleTime, withLatestFrom } from 'rxjs/operators';
import { SnackService } from '../../core/snack/snack.service';
import { ConfigService } from '../../config/config.service';
import { msToString } from '../../ui/duration/ms-to-string.pipe';

const BREAK_TRIGGER_DURATION = 5 * 60 * 1000;

// required because typescript freaks out
const reduceBreak = (acc, [tick, currentTaskId]) => {
  return currentTaskId ? 0 : acc + tick.duration;
};
// required because typescript freaks out
const createReduceTimeWorked = (obj, key) => {
  return (acc, [tick, breakDuration]) => {
    return (breakDuration > BREAK_TRIGGER_DURATION) ? 0 : obj[key] + tick.duration;
  };
};

@Injectable({
  providedIn: 'root'
})
export class TakeABreakService {
  /* tslint:disable*/
  private _breakDuration$: Observable<number> = this._timeTrackingService.tick$.pipe(
    withLatestFrom(
      this._taskService.currentTaskId$,
    ),
    scan(reduceBreak, 0)
  );
  public timeWorkingWithoutABreak$: Observable<number> = this._timeTrackingService.tick$.pipe(
    withLatestFrom(
      this._breakDuration$,
    ),
    scan(createReduceTimeWorked(this, 'timeWorkedWithoutABreakAcc'), 0),
    distinctUntilChanged()
  );
  /* tslint:enable*/

  private timeWorkedWithoutABreakAcc = 0;
  private timeWorkedWithoutABreakLastOverZero = 0;
  private isBlockByIdle = false;

  constructor(
    private _taskService: TaskService,
    private _timeTrackingService: TimeTrackingService,
    private _configService: ConfigService,
    private _snackService: SnackService,
  ) {
    this.timeWorkingWithoutABreak$.subscribe(val => {
      if (!this.isBlockByIdle) {
        this.timeWorkedWithoutABreakAcc = val;
        if (val > 0) {
          this.timeWorkedWithoutABreakLastOverZero = val;
        }
      }
    });
    this.timeWorkingWithoutABreak$
      .pipe(throttleTime(60 * 1000))
      // .pipe(throttleTime(5 * 1000))
      .subscribe(timeWithoutBreak => {
        const cfg = this._configService.cfg.misc;
        if (cfg.isTakeABreakEnabled && timeWithoutBreak > cfg.takeABreakMinWorkingTime) {
          const msg = this._getMessage(timeWithoutBreak);
          console.log(cfg, timeWithoutBreak, msg);
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
        }
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

  private reduceTimeWorked(acc, [breakDuration, tick]) {
    return (breakDuration > BREAK_TRIGGER_DURATION) ? 0 : this.timeWorkedWithoutABreakAcc + tick.duration;
  }

  private _getMessage(duration) {
    if (this._configService.cfg && this._configService.cfg.misc.takeABreakMessage) {
      const durationStr = msToString(duration);
      return this._configService.cfg.misc.takeABreakMessage
        .replace(/\$\{duration\}/gi, durationStr);
    }
  }
}
