import { Injectable } from '@angular/core';
import { IdleService } from '../time-tracking/idle.service';
import { TaskService } from '../tasks/task.service';
import { GlobalConfigService } from '../config/global-config.service';
import { combineLatest, EMPTY, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { realTimer$ } from './real-timer';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { msToString } from '../../ui/duration/ms-to-string.pipe';

@Injectable({
  providedIn: 'root'
})
export class StartTrackingReminderService {
  // TODO implement
  cfgx$: any = this._globalConfigService.cfg$;
  cfg$: any = of({
    minTime: 4000,
    isEnabled: true,
  });

  // counter$: any = interval(1000).pipe(
  //   timeInterval(),
  //   scan((acc: number, curr) => (acc + curr.interval), 0)
  // );
  counter$: any = realTimer$(1000);

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

  // private _manualReset$: Subject<void> = new Subject();

  constructor(
    private _idleService: IdleService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
    private _bannerService: BannerService,
  ) {
    // this.counter$.subscribe((v) => console.log('test', v))
    this.remindCounter$.subscribe((v) => console.log('remind$', v));
  }

  init() {
    this.remindCounter$.subscribe((count) => {
      const isShow = true;
      if (isShow) {
        this._openBanner(count, {});
      } else {
        this._bannerService.dismiss(BannerId.StartTrackingReminder);
      }
    });

  }

  private _openBanner(duration: number, cfg: any) {
    const durationStr = msToString(duration);
    this._bannerService.open({
      id: BannerId.StartTrackingReminder,
      ico: 'free_breakfast',
      msg: 'You have been not tracking time for' + durationStr,
      translateParams: {
        time: '15m'
      },
      action: {
        label: 'Add to task',
        fn: () => {
          this._bannerService.dismiss(BannerId.StartTrackingReminder);
        }
      },
      action2: {
        label: 'Dismiss',
        fn: () => {
          this._bannerService.dismiss(BannerId.StartTrackingReminder);
        }
      },
    });
  }
}
