import { Injectable } from '@angular/core';
import { TimeTrackingService } from '../time-tracking/time-tracking.service';
import { IdleService } from '../time-tracking/idle.service';
import { TaskService } from '../tasks/task.service';
import { GlobalConfigService } from '../config/global-config.service';
import { combineLatest, EMPTY, Observable, of } from 'rxjs';
import { mapTo, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StartTrackingReminderService {
  // TODO implement
  cfg$: any = this._globalConfigService.cfg$;

  countTick$: Observable<number> = this._timeTrackingService.tick$.pipe(
    mapTo(1000),
  );

  remind$: Observable<any> = of(true).pipe(
    switchMap((isEnabled) => !isEnabled
      ? EMPTY
      : combineLatest([
        this._taskService.currentTaskId$,
        this._idleService.isIdle$,
      ])),
    switchMap(([currentTaskId, isIdle]) => !currentTaskId && !isIdle
      ? this.countTick$
      : of(0)
    )
    // some how use this to accumulate
    // : this._timeTrackingService.tick$.pipe(scan(reduceBreak, 0));
  );

  constructor(
    private _timeTrackingService: TimeTrackingService,
    private _idleService: IdleService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
    // private _bannerService: BannerService,
  ) {
  }

  private _openBanner() {
  }
}
