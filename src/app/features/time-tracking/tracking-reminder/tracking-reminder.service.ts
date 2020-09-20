import { Injectable } from '@angular/core';
import { IdleService } from '../idle.service';
import { TaskService } from '../../tasks/task.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { combineLatest, EMPTY, merge, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { realTimer$ } from '../../../util/real-timer';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { msToString } from '../../../ui/duration/ms-to-string.pipe';
import { MatDialog } from '@angular/material/dialog';
import { DialogTrackingReminderComponent } from './dialog-tracking-reminder/dialog-tracking-reminder.component';
import { Task } from '../../tasks/task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { T } from '../../../t.const';
import { TranslateService } from '@ngx-translate/core';
import { TrackingReminderConfig } from '../../config/global-config.model';

@Injectable({
  providedIn: 'root'
})
export class TrackingReminderService {
  _cfg$: Observable<TrackingReminderConfig> = this._globalConfigService.cfg$.pipe(map(cfg => cfg?.trackingReminder));

  _counter$: Observable<number> = realTimer$(1000);

  _manualReset$: Subject<void> = new Subject();

  _resetableCounter$: Observable<number> = merge(
    of(true),
    this._manualReset$,
  ).pipe(
    switchMap(() => this._counter$),
  );

  remindCounter$: Observable<number> = this._cfg$.pipe(
    switchMap((cfg) => !cfg.isEnabled
      ? EMPTY
      : combineLatest([
        this._taskService.currentTaskId$,
        this._idleService.isIdle$,
      ]).pipe(
        map(([currentTaskId, isIdle]) => !currentTaskId && !isIdle),
        distinctUntilChanged(),
        switchMap((isEnabled) => isEnabled
          ? this._resetableCounter$
          : of(0)
        ),
        filter(time => time > cfg.minTime),
      )
    ),
    shareReplay(),
  );

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
      this._triggerBanner(count, {});
    });
  }

  private _triggerBanner(duration: number, cfg: any) {
    // don't update if this or other dialogs are open
    if (this._matDialog.openDialogs.length !== 0) {
      return;
    }

    const durationStr = msToString(duration);
    this._bannerService.open({
      id: BannerId.StartTrackingReminder,
      ico: 'timer',
      msg: this._translateService.instant(T.F.TIME_TRACKING.B_TTR.MSG, {time: durationStr}),
      action: {
        label: T.F.TIME_TRACKING.B_TTR.ADD_TO_TASK,
        fn: () => this._openDialog(),
      },
      action2: {
        label: T.G.DISMISS,
        fn: () => this._dismissBanner(),
      },
    });
  }

  private _openDialog() {
    this._matDialog.open(DialogTrackingReminderComponent, {
      data: {
        remindCounter$: this.remindCounter$,
      }
    }).afterClosed()
      .pipe(
        withLatestFrom(this.remindCounter$),
      )
      .subscribe(async ([{task} = {task: undefined}, remindCounter]: [{ task: Task | string | undefined }, number]): Promise<void> => {
        this._manualReset$.next();
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
        this._dismissBanner();
      });
  }

  private _dismissBanner() {
    this._bannerService.dismiss(BannerId.StartTrackingReminder);
    this._manualReset$.next();
  }
}
