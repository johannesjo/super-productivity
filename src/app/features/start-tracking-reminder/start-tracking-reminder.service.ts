import { Injectable } from '@angular/core';
import { IdleService } from '../time-tracking/idle.service';
import { TaskService } from '../tasks/task.service';
import { GlobalConfigService } from '../config/global-config.service';
import { combineLatest, EMPTY, interval, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, scan, switchMap, timeInterval } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StartTrackingReminderService {
  // TODO implement
  cfg$: any = this._globalConfigService.cfg$;

  counter$: any = interval(1000).pipe(
    timeInterval(),
    scan((acc: number, curr) => (acc + curr.interval), 0)
  );

  // TODO replace with settings once done
  remindCounter$: Observable<any> = of(true).pipe(
    switchMap((isEnabled) => !isEnabled
      ? EMPTY
      : combineLatest([
        this._taskService.currentTaskId$,
        this._idleService.isIdle$,
      ])),
    map(([currentTaskId, isIdle]) => !currentTaskId && !isIdle),
    distinctUntilChanged(),
    switchMap((isEnabled) => isEnabled
      ? this.counter$
      : of(0)
    )
  );

  constructor(
    private _idleService: IdleService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
    // private _bannerService: BannerService,
  ) {
    // this.counter$.subscribe((v) => console.log('test', v))
    this.remindCounter$.subscribe((v) => console.log('remind$', v));
  }

  init() {
    console.log('INIT');
    this._openBanner();
  }

  private _openBanner() {
  }
}
