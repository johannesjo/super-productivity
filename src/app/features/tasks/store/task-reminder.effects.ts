import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deleteTask,
  reScheduleTask,
  scheduleTask,
  unScheduleTask,
  updateTask,
  updateTaskTags,
} from './task.actions';
import { concatMap, filter, map, mergeMap, tap } from 'rxjs/operators';
import { ReminderService } from '../../reminder/reminder.service';
import { truncate } from '../../../util/truncate';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { TODAY_TAG } from '../../tag/tag.const';
import { EMPTY } from 'rxjs';
import { TaskService } from '../task.service';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { DEFAULT_DAY_START } from '../../config/default-global-config.const';
import { moveProjectTaskToBacklogListAuto } from '../../project/store/project.actions';

@Injectable()
export class TaskReminderEffects {
  addTaskReminder$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(scheduleTask),
      tap(({ task }) =>
        this._snackService.open({
          type: 'SUCCESS',
          translateParams: {
            title: truncate(task.title),
          },
          msg: T.F.TASK.S.REMINDER_ADDED,
          ico: 'schedule',
        }),
      ),
      mergeMap(({ task, remindAt, isMoveToBacklog }) => {
        if (isMoveToBacklog && !task.projectId) {
          throw new Error('Move to backlog not possible for non project tasks');
        }
        if (typeof remindAt !== 'number') {
          return EMPTY;
        }

        const reminderId = this._reminderService.addReminder(
          'TASK',
          task.id,
          truncate(task.title),
          remindAt,
        );
        const isRemoveFromToday = isMoveToBacklog && task.tagIds.includes(TODAY_TAG.id);

        return [
          updateTask({
            task: { id: task.id, changes: { reminderId } },
          }),
          ...(isMoveToBacklog
            ? [
                moveProjectTaskToBacklogListAuto({
                  taskId: task.id,
                  projectId: task.projectId as string,
                }),
              ]
            : []),
          ...(isRemoveFromToday
            ? [
                updateTaskTags({
                  task,
                  newTagIds: task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id),
                  oldTagIds: task.tagIds,
                }),
              ]
            : []),
        ];
      }),
    ),
  );

  updateTaskReminder$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(reScheduleTask),
        filter(
          ({ reminderId, remindAt }) => typeof remindAt === 'number' && !!reminderId,
        ),
        tap(({ title, remindAt, reminderId }) => {
          this._reminderService.updateReminder(reminderId as string, {
            remindAt,
            title,
          });
        }),
        tap(({ title }) =>
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              title: truncate(title),
            },
            msg: T.F.TASK.S.REMINDER_UPDATED,
            ico: 'schedule',
          }),
        ),
      ),
    { dispatch: false },
  );

  removeTaskReminder$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(unScheduleTask),
      filter(({ reminderId }) => !!reminderId),
      tap(({ isSkipToast }) => {
        if (!isSkipToast) {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.TASK.S.REMINDER_DELETED,
            ico: 'schedule',
          });
        }
      }),
      map(({ id, reminderId }) => {
        this._reminderService.removeReminder(reminderId as string);
        return updateTask({
          task: {
            id,
            changes: { reminderId: null, plannedAt: null },
          },
        });
      }),
    ),
  );

  clearReminders: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTask),
        tap(({ task }) => {
          const deletedTaskIds = [task.id, ...task.subTaskIds];
          deletedTaskIds.forEach((id) => {
            this._reminderService.removeReminderByRelatedIdIfSet(id);
          });
        }),
      ),
    { dispatch: false },
  );

  unscheduleDoneTask$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }) => !!task.changes.isDone),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        tap((task) => {
          if (task.reminderId) {
            this._taskService.unScheduleTask(task.id, task.reminderId);
          }
        }),
      ),
    { dispatch: false },
  );

  unscheduleScheduledForDayWhenAddedToToday$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTaskTags),
        filter(({ newTagIds }) => !!newTagIds && newTagIds.includes(TODAY_TAG.id)),
        tap(({ task }) => {
          if (
            task.reminderId &&
            task.plannedAt &&
            // NOTE this could be an alternative approach
            // task.plannedAt === getDateTimeFromClockString(DEFAULT_DAY_START, new Date())
            task.plannedAt ===
              getDateTimeFromClockString(DEFAULT_DAY_START, task.plannedAt)
          ) {
            this._taskService.unScheduleTask(task.id, task.reminderId, true);
          }
        }),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _reminderService: ReminderService,
    private _snackService: SnackService,
    private _taskService: TaskService,
  ) {}
}
