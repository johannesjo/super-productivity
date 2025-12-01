import { Injectable, inject } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { ReminderService } from '../reminder.service';
import {
  selectCurrentTaskId,
  selectTaskById,
  selectTasksById,
} from '../../tasks/store/task.selectors';
import {
  concatMap,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';
import { Store } from '@ngrx/store';
import { BannerService } from '../../../core/banner/banner.service';
import { Reminder } from '../reminder.model';
import { selectReminderConfig } from '../../config/store/global-config.reducer';
import { BehaviorSubject, combineLatest, EMPTY, timer } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import { Task, TaskWithReminder } from '../../tasks/task.model';
import { ProjectService } from '../../project/project.service';
import { Router } from '@angular/router';
import { DataInitStateService } from '../../../core/data-init/data-init-state.service';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { Log } from '../../../core/log';

const UPDATE_PERCENTAGE_INTERVAL = 250;
// since the reminder modal doesn't show instantly we adjust a little for that
const COUNTDOWN_MAGIC_GAP = 500;

@Injectable()
export class ReminderCountdownEffects {
  private actions$ = inject(Actions);
  private _reminderService = inject(ReminderService);
  private _datePipe = inject(LocaleDatePipe);
  private _store = inject(Store);
  private _bannerService = inject(BannerService);
  private _dataInitStateService = inject(DataInitStateService);
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);
  private _router = inject(Router);

  reminderCountdownBanner$ = createEffect(
    () =>
      this._dataInitStateService.isAllDataLoadedInitially$.pipe(
        concatMap(() => this._store.select(selectReminderConfig)),
        switchMap((reminderCfg) =>
          reminderCfg.isCountdownBannerEnabled
            ? combineLatest([
                this._reminderService.reminders$,
                this._skippedReminderIds$,
              ]).pipe(
                map(([reminders, skippedReminderIds]) => {
                  const now = Date.now();
                  return reminders.filter(
                    (reminder) =>
                      reminder.type === 'TASK' &&
                      reminder.remindAt - reminderCfg.countdownDuration < now &&
                      // reminders due will show as an alert anyway
                      reminder.remindAt > now &&
                      !skippedReminderIds.includes(reminder.id),
                  );
                }),
                switchMap((dueReminders) =>
                  this._store
                    .select(selectCurrentTaskId)
                    .pipe(distinctUntilChanged())
                    .pipe(map((currentId) => ({ currentId, dueReminders }))),
                ),
                switchMap(({ dueReminders, currentId }) => {
                  const taskIds = dueReminders
                    .map((dr) => dr.relatedId)
                    .filter((id) => id !== currentId);
                  return this._store.select(selectTasksById, { ids: taskIds }).pipe(
                    map((tasks) => {
                      return dueReminders
                        .map((reminder, i) => {
                          return { reminder, task: tasks[i] };
                        })
                        .filter(({ reminder, task }) => !!(reminder && task));
                    }),
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

  private _skippedReminderIds$ = new BehaviorSubject<string[]>([]);
  private _currentBannerReminder?: Reminder;

  private _skipReminder(reminderId: string): void {
    this._skippedReminderIds$.next([...this._skippedReminderIds$.getValue(), reminderId]);
  }

  private async _showBanner(
    dueRemindersAndTasks: { reminder: Reminder; task: Task }[],
  ): Promise<void> {
    const firstDue = dueRemindersAndTasks[0];
    if (!firstDue) {
      this._bannerService.dismiss(BannerId.ReminderCountdown);
      this._currentBannerReminder = undefined;
      return;
    }
    if (
      this._currentBannerReminder &&
      this._currentBannerReminder.id === firstDue.reminder.id &&
      this._currentBannerReminder.remindAt === firstDue.reminder.remindAt
    ) {
      // just leave banner as
      return;
    }
    this._currentBannerReminder = firstDue.reminder;

    const firstDueTask = await this._store
      .select(selectTaskById, { id: firstDue.reminder.relatedId })
      .pipe(first())
      .toPromise();

    const showBannerStart = Date.now();
    const remainingAtBannerStart = firstDue.reminder.remindAt - showBannerStart;

    const startsAt = this._datePipe.transform(
      firstDue.reminder.remindAt,
      'shortTime',
    ) as string;

    const nrOfAllBanners = dueRemindersAndTasks.length;
    Log.log({
      firstDueTask,
      firstDue,
      dueRemindersAndTasks,
    });

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
          this._skipReminder(firstDue.reminder.id);
          this._currentBannerReminder = undefined;
        },
      },
      action2: {
        label: T.F.REMINDER.COUNTDOWN_BANNER.START_NOW,
        fn: () => {
          this._skipReminder(firstDue.reminder.id);
          this._currentBannerReminder = undefined;
          this._startTask(firstDue.task as TaskWithReminder);
        },
      },
      progress$: timer(0, UPDATE_PERCENTAGE_INTERVAL).pipe(
        map(() => {
          const now = Date.now();
          const elapsedTime = now - showBannerStart - COUNTDOWN_MAGIC_GAP;
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
      this._store.dispatch(
        TaskSharedActions.unscheduleTask({
          id: task.id,
          reminderId: task.reminderId,
        }),
      );
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
