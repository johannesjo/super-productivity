import { Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { ReminderService } from '../reminder.service';
import { selectAllTasks, selectTaskById } from '../../tasks/store/task.selectors';
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
import { ReminderConfig } from '../../config/global-config.model';

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
                tap((dueReminders) => this._showBanner(dueReminders, reminderCfg)),
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

  private async _showBanner(
    dueReminders: Reminder[],
    reminderCfg: ReminderConfig,
  ): Promise<void> {
    console.log('SHOW REMINDER BANNER', dueReminders);

    const firstDueReminder = dueReminders[0];
    if (!firstDueReminder) {
      return;
    }
    console.log(await this._store.select(selectAllTasks).pipe(first()).toPromise());

    const firstDueTask = await this._store
      .select(selectTaskById, { id: firstDueReminder.relatedId })
      .pipe(first())
      .toPromise();

    const start = this._datePipe.transform(
      firstDueReminder.remindAt,
      'shortTime',
    ) as string;
    const isInPast = firstDueReminder.remindAt < Date.now();

    const nrOfAllBanners = dueReminders.length;
    console.log({ firstDueTask, firstDueReminder, dueReminders });

    this._bannerService.open({
      id: BannerId.ReminderCountdown,
      ico: 'alarm',
      msg: isInPast
        ? nrOfAllBanners > 1
          ? T.F.CALENDARS.BANNER.TXT_PAST_MULTIPLE
          : T.F.CALENDARS.BANNER.TXT_PAST
        : nrOfAllBanners > 1
        ? T.F.CALENDARS.BANNER.TXT_MULTIPLE
        : T.F.CALENDARS.BANNER.TXT,
      translateParams: {
        title: firstDueTask.title,
        start,
        nrOfOtherBanners: nrOfAllBanners - 1,
      },
      action: {
        label: T.G.DISMISS,
        fn: () => {
          this._skipReminder(firstDueReminder.id);
        },
      },
      action2: {
        // label: T.G.DISMISS,
        label: 'Start now',
        fn: () => {
          this._skipReminder(firstDueReminder.id);
          this._startTask(firstDueTask as TaskWithReminder);
        },
      },
      progress$: timer(0, 1000).pipe(
        map(() => {
          const now = Date.now();
          // NOTE: works, but math is unclear xD
          const somethingLikeElapsedTime = firstDueReminder.remindAt - now;
          const percentage =
            // eslint-disable-next-line no-mixed-operators
            100 - (somethingLikeElapsedTime / reminderCfg.countdownDuration) * 100;
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
