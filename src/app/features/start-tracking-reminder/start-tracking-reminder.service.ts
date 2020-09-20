import { Injectable } from '@angular/core';
import { IdleService } from '../time-tracking/idle.service';
import { TaskService } from '../tasks/task.service';
import { GlobalConfigService } from '../config/global-config.service';
import { combineLatest, EMPTY, Observable, of } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { realTimer$ } from './real-timer';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { MatDialog } from '@angular/material/dialog';
import { DialogStartTrackingReminderComponent } from './dialog-start-tracking-reminder/dialog-start-tracking-reminder.component';
import { Task } from '../tasks/task.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import { T } from '../../t.const';
import { TranslateService } from '@ngx-translate/core';

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

  counter$: Observable<number> = realTimer$(1000);

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
    ),
    shareReplay(),
  );

  // private _manualReset$: Subject<void> = new Subject();

  constructor(
    private _idleService: IdleService,
    private _taskService: TaskService,
    private _globalConfigService: GlobalConfigService,
    private _bannerService: BannerService,
    private _matDialog: MatDialog,
    private _translateService: TranslateService,
  ) {
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
      ico: 'timer',
      msg: this._translateService.instant(T.F.TIME_TRACKING.B_TTR.MSG, {time: durationStr}),
      // 'You have been not been tracking time for' + durationStr,
      action: {
        label: T.F.TIME_TRACKING.B_TTR.ADD_TO_TASK,
        fn: () => {
          this._matDialog.open(DialogStartTrackingReminderComponent, {
            data: {
              remindCounter$: this.remindCounter$,
            }
          }).afterClosed()
            .pipe(
              withLatestFrom(this.remindCounter$),
            )
            .subscribe(async ([{task, isCancel = false}, remindCounter]: [{ task: Task | string, isCancel: boolean, isTrackAsBreak: boolean }, number]): Promise<void> => {
              const timeSpent = remindCounter;
              if (task) {
                if (typeof task === 'string') {
                  const currId = this._taskService.add(task, false, {
                    timeSpent,
                    timeSpentOnDay: {
                      [getWorklogStr()]: timeSpent
                    }
                  });
                  this._taskService.setCurrentId(currId);
                } else {
                  this._taskService.addTimeSpent(task, timeSpent);
                  this._taskService.setCurrentId(task.id);
                }
              }
              // this.cancelIdlePoll();
              // this._isIdle$.next(false);
              // this.isIdleDialogOpen = false;
            });
        }
      },
      action2: {
        label: T.G.DISMISS,
        fn: () => {
          this._bannerService.dismiss(BannerId.StartTrackingReminder);
        }
      },
    });
  }
}
