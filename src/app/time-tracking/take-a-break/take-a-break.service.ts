import { Injectable } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { TimeTrackingService } from '../time-tracking.service';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, scan } from 'rxjs/operators';

const BREAK_TRIGGER_DURATION = 5 * 60 * 1000;


@Injectable({
  providedIn: 'root'
})
export class TakeABreakService {
  /* tslint:disable*/
  private _breakDuration$: Observable<number> = combineLatest(
    this._taskService.currentTaskId$,
    this._timeTrackingService.tick$
  ).pipe(
    scan(this.reduceBreak.bind(this), 0)
  );
  public timeWorkingWithoutABreak$: Observable<number> = combineLatest(
    this._breakDuration$,
    this._timeTrackingService.tick$
  )
    .pipe(
      scan(this.reduceTimeWorked.bind(this), 0),
      distinctUntilChanged()
    );
  /* tslint:enable*/

  private timeWorkedWithoutABreakAcc = 0;
  private timeWorkedWithoutABreakLastOverZero = 0;
  private isBlockByIdle = false;

  constructor(
    private _taskService: TaskService,
    private _timeTrackingService: TimeTrackingService,
  ) {
    this.timeWorkingWithoutABreak$.subscribe(val => {
      if (!this.isBlockByIdle) {
        this.timeWorkedWithoutABreakAcc = val;
        if (val > 0) {
          this.timeWorkedWithoutABreakLastOverZero = val;
        }
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

  // required because typescript freaks out
  private reduceBreak(acc, [currentTaskId, tick]) {
    return currentTaskId ? 0 : acc + tick.duration;
  };

}
