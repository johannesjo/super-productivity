import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deleteTask,
  deleteTasks,
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
import { isSameDay } from '../../../util/is-same-day';
import { isToday } from '../../../util/is-today.util';

@Injectable()
export class TaskReminderEffects {
  private _actions$ = inject(Actions);
  private _reminderService = inject(ReminderService);
  private _snackService = inject(SnackService);
  private _taskService = inject(TaskService);

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
      mergeMap(
        ({ isSkipAutoRemoveFromToday, task, remindAt, plannedAt, isMoveToBacklog }) => {
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

          const isRemoveFromToday =
            !isSkipAutoRemoveFromToday &&
            task.tagIds.includes(TODAY_TAG.id) &&
            (!isToday(plannedAt) || isMoveToBacklog);

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
                  }),
                ]
              : []),
          ];
        },
      ),
    ),
  );

  updateTaskReminder$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(reScheduleTask),
      filter(({ task, remindAt }) => typeof remindAt === 'number' && !!task.reminderId),
      tap(({ task, remindAt }) => {
        this._reminderService.updateReminder(task.reminderId as string, {
          remindAt,
          title: task.title,
        });
      }),
      tap(({ task }) =>
        this._snackService.open({
          type: 'SUCCESS',
          translateParams: {
            title: truncate(task.title),
          },
          msg: T.F.TASK.S.REMINDER_UPDATED,
          ico: 'schedule',
        }),
      ),
      mergeMap(({ task, remindAt, plannedAt, isMoveToBacklog }) => {
        if (isMoveToBacklog && !task.projectId) {
          throw new Error('Move to backlog not possible for non project tasks');
        }
        if (typeof remindAt !== 'number') {
          return EMPTY;
        }

        const isRemoveFromToday =
          task.tagIds.includes(TODAY_TAG.id) &&
          (!isSameDay(new Date(), plannedAt) || isMoveToBacklog);

        return [
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
                }),
              ]
            : []),
        ];
      }),
    ),
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
  clearMultipleReminders: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTasks),
        tap(({ taskIds }) => {
          this._reminderService.removeRemindersByRelatedIds(taskIds);
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
        tap(({ task, newTagIds }) => {
          if (
            task.reminderId &&
            task.plannedAt &&
            newTagIds.includes(TODAY_TAG.id) &&
            !task.tagIds.includes(TODAY_TAG.id) &&
            task.plannedAt === getDateTimeFromClockString(DEFAULT_DAY_START, new Date())
          ) {
            console.log('unscheduleScheduledForDayWhenAddedToToday$ special case <3');
            this._taskService.unScheduleTask(task.id, task.reminderId, true);
          }
        }),
      ),
    { dispatch: false },
  );
}
