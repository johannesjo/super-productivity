import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import {
  DeleteTask,
  ReScheduleTask,
  ScheduleTask,
  TaskActionTypes,
  UnScheduleTask,
  UpdateTask,
  UpdateTaskTags,
} from './task.actions';
import { concatMap, filter, map, mergeMap, tap } from 'rxjs/operators';
import { ReminderService } from '../../reminder/reminder.service';
import { truncate } from '../../../util/truncate';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { moveTaskToBacklogListAuto } from '../../work-context/store/work-context-meta.actions';
import { TODAY_TAG } from '../../tag/tag.const';
import { EMPTY } from 'rxjs';
import { TaskService } from '../task.service';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { DEFAULT_DAY_START } from '../../config/default-global-config.const';

@Injectable()
export class TaskReminderEffects {
  @Effect()
  addTaskReminder$: any = this._actions$.pipe(
    ofType(TaskActionTypes.ScheduleTask),
    tap((a: ScheduleTask) =>
      this._snackService.open({
        type: 'SUCCESS',
        translateParams: {
          title: truncate(a.payload.task.title),
        },
        msg: T.F.TASK.S.REMINDER_ADDED,
        ico: 'schedule',
      }),
    ),
    mergeMap((a: ScheduleTask) => {
      console.log(a);

      const { task, remindAt, isMoveToBacklog } = a.payload;
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
        new UpdateTask({
          task: { id: task.id, changes: { reminderId } },
        }),
        ...(isMoveToBacklog
          ? [
              moveTaskToBacklogListAuto({
                taskId: task.id,
                workContextId: task.projectId as string,
              }),
            ]
          : []),
        ...(isRemoveFromToday
          ? [
              new UpdateTaskTags({
                task,
                newTagIds: task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id),
                oldTagIds: task.tagIds,
              }),
            ]
          : []),
      ];
    }),
  );

  @Effect({ dispatch: false })
  updateTaskReminder$: any = this._actions$.pipe(
    ofType(TaskActionTypes.ReScheduleTask),
    filter(
      ({ payload }: ReScheduleTask) =>
        typeof payload.remindAt === 'number' && !!payload.reminderId,
    ),
    tap((a: ReScheduleTask) => {
      console.log(a);
      const { title, remindAt, reminderId } = a.payload;
      this._reminderService.updateReminder(reminderId as string, {
        remindAt,
        title,
      });
    }),
    tap((a: ReScheduleTask) =>
      this._snackService.open({
        type: 'SUCCESS',
        translateParams: {
          title: truncate(a.payload.title),
        },
        msg: T.F.TASK.S.REMINDER_UPDATED,
        ico: 'schedule',
      }),
    ),
  );

  @Effect()
  removeTaskReminder$: any = this._actions$.pipe(
    ofType(TaskActionTypes.UnScheduleTask),
    filter(({ payload }: UnScheduleTask) => !!payload.reminderId),
    tap(({ payload }: UnScheduleTask) => {
      if (!payload.isSkipToast) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.TASK.S.REMINDER_DELETED,
          ico: 'schedule',
        });
      }
    }),
    map((a: UnScheduleTask) => {
      const { id, reminderId } = a.payload;
      this._reminderService.removeReminder(reminderId as string);

      return new UpdateTask({
        task: {
          id,
          changes: { reminderId: null, plannedAt: null },
        },
      });
    }),
  );

  @Effect({ dispatch: false })
  clearReminders: any = this._actions$.pipe(
    ofType(TaskActionTypes.DeleteTask),
    tap((a: DeleteTask) => {
      const deletedTaskIds = [a.payload.task.id, ...a.payload.task.subTaskIds];
      deletedTaskIds.forEach((id) => {
        this._reminderService.removeReminderByRelatedIdIfSet(id);
      });
    }),
  );

  @Effect({ dispatch: false })
  unscheduleDoneTask$: any = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTask),
    filter(({ payload }: UpdateTask) => !!payload.task.changes.isDone),
    concatMap(({ payload }) => this._taskService.getByIdOnce$((payload as any).task.id)),
    tap((task) => {
      if (task.reminderId) {
        this._taskService.unScheduleTask(task.id, task.reminderId);
      }
    }),
  );

  @Effect({ dispatch: false })
  unscheduleScheduledForDayWhenAddedToToday$: any = this._actions$.pipe(
    ofType(TaskActionTypes.UpdateTaskTags),
    filter(
      ({ payload }: UpdateTaskTags) =>
        !!payload.newTagIds && payload.newTagIds.includes(TODAY_TAG.id),
    ),
    tap(({ payload: { task } }: UpdateTaskTags) => {
      if (
        task.reminderId &&
        task.plannedAt &&
        task.plannedAt === getDateTimeFromClockString(DEFAULT_DAY_START, task.plannedAt)
      ) {
        this._taskService.unScheduleTask(task.id, task.reminderId, true);
      }
    }),
  );

  constructor(
    private _actions$: Actions,
    private _reminderService: ReminderService,
    private _snackService: SnackService,
    private _taskService: TaskService,
  ) {}
}
