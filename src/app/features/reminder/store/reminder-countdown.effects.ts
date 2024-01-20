import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { ReminderService } from '../reminder.service';
import { selectTaskById } from '../../tasks/store/task.selectors';
import { concatMap, first, map, switchMap, tap } from 'rxjs/operators';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { BannerService } from '../../../core/banner/banner.service';
import { Reminder } from '../reminder.model';
import { selectReminderConfig } from '../../config/store/global-config.reducer';
import { EMPTY, timer } from 'rxjs';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { TaskService } from '../../tasks/task.service';
import { TaskWithReminder } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Router } from '@angular/router';

@Injectable()
export class ReminderCountdownEffects {
  reminderCountdownBanner$ = createEffect(
    () =>
      this._dataInitService.isAllDataLoadedInitially$.pipe(
        concatMap(() => this._store.select(selectReminderConfig)),
        switchMap((reminderCfg) =>
          reminderCfg.isCountdownBannerEnabled
            ? this._reminderService.reminders$.pipe(
                map((reminders) => {
                  const now = Date.now();
                  return reminders.filter(
                    (reminder) =>
                      reminder.type === 'TASK' &&
                      reminder.remindAt - reminderCfg.countdownDuration < now &&
                      // reminders due will show as an alert anyway
                      reminder.remindAt > now &&
                      !this._skippedReminderIds.includes(reminder.id),
                  );
                }),
                tap((dueReminders) => this._showBanner(dueReminders)),
              )
            : EMPTY,
        ),
      ),
    {
      dispatch: false,
    },
  );

  private _skippedReminderIds: string[] = [];

  constructor(
    private actions$: Actions,
    private _reminderService: ReminderService,
    private _datePipe: DatePipe,
    private _store: Store,
    private _bannerService: BannerService,
    private _dataInitService: DataInitService,
    private _taskService: TaskService,
    private _projectService: ProjectService,
    private _router: Router,
  ) {}

  private _skipReminder(reminderId: string): void {
    this._skippedReminderIds.push(reminderId);
  }

  private async _showBanner(dueReminders: Reminder[]): Promise<void> {
    const firstDueReminder = dueReminders[0];
    if (!firstDueReminder) {
      return;
    }
    const firstDueTask = await this._store
      .select(selectTaskById, { id: firstDueReminder.relatedId })
      .pipe(first())
      .toPromise();

    const showBannerStart = Date.now();
    const remainingAtBannerStart = firstDueReminder.remindAt - showBannerStart;

    const startsAt = this._datePipe.transform(
      firstDueReminder.remindAt,
      'shortTime',
    ) as string;

    const nrOfAllBanners = dueReminders.length;
    console.log({ firstDueTask, firstDueReminder, dueReminders });

    this._bannerService.open({
      id: BannerId.ReminderCountdown,
      ico: 'alarm',
      msg:
        nrOfAllBanners > 1
          ? T.F.REMINDER.COUNTDOWN_BANNER.TXT_MULTIPLE
          : T.F.REMINDER.COUNTDOWN_BANNER.TXT,
      translateParams: {
        title: firstDueTask.title,
        start: startsAt,
        nrOfOtherBanners: nrOfAllBanners - 1,
      },
      action: {
        label: T.G.HIDE,
        fn: () => {
          this._skipReminder(firstDueReminder.id);
        },
      },
      action2: {
        label: T.F.REMINDER.COUNTDOWN_BANNER.START_NOW,
        fn: () => {
          this._skipReminder(firstDueReminder.id);
          this._startTask(firstDueTask as TaskWithReminder);
        },
      },
      progress$: timer(0, 250).pipe(
        map(() => {
          const now = Date.now();
          const elapsedTime = now - showBannerStart;
          const percentage = (elapsedTime / remainingAtBannerStart) * 100;
          return percentage;
        }),
      ),
      // action2:
    });
  }

  private _startTask(task: TaskWithReminder): void {
    // NOTE: reminder needs to be deleted first to avoid problems with "Missing reminder" devError
    if (!!task.reminderId) {
      this._taskService.unScheduleTask(task.id, task.reminderId);
    }
    if (task.projectId) {
      if (!!task.parentId) {
        this._projectService.moveTaskToTodayList(task.parentId, task.projectId, true);
      } else {
        this._projectService.moveTaskToTodayList(task.id, task.projectId, true);
      }
    }
    this._taskService.setCurrentId(task.id);
    this._router.navigate(['/active/tasks']);
  }
}
