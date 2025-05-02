import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addReminderIdToTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  removeReminderFromTask,
  reScheduleTaskWithTime,
  scheduleTaskWithTime,
  unScheduleTask,
  updateTask,
} from './task.actions';
import { concatMap, filter, map, mergeMap, tap } from 'rxjs/operators';
import { ReminderService } from '../../reminder/reminder.service';
import { truncate } from '../../../util/truncate';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { EMPTY } from 'rxjs';
import { TaskService } from '../task.service';
import { moveProjectTaskToBacklogListAuto } from '../../project/store/project.actions';
import { flattenTasks } from './task.selectors';
import { Store } from '@ngrx/store';
import { PlannerActions } from '../../planner/store/planner.actions';
import { planTaskForToday } from '../../tag/store/tag.actions';

@Injectable()
export class TaskReminderEffects {
  private _actions$ = inject(Actions);
  private _reminderService = inject(ReminderService);
  private _snackService = inject(SnackService);
  private _taskService = inject(TaskService);
  private _store = inject(Store);

  snack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(scheduleTaskWithTime),
        tap(({ task }) => {
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              title: truncate(task.title),
            },
            msg: T.F.TASK.S.REMINDER_ADDED,
            ico: 'schedule',
          });
        }),
      ),
    { dispatch: false },
  );

  createReminderAndAddToTask$ = createEffect(() =>
    this._actions$.pipe(
      ofType(scheduleTaskWithTime),
      filter(({ task, remindAt }) => typeof remindAt === 'number'),
      map(({ task, remindAt }) => {
        const reminderId = this._reminderService.addReminder(
          'TASK',
          task.id,
          truncate(task.title),
          remindAt as number,
        );
        return addReminderIdToTask({
          taskId: task.id,
          reminderId,
        });
      }),
    ),
  );

  autoMoveToBacklog$ = createEffect(() =>
    this._actions$.pipe(
      ofType(scheduleTaskWithTime),
      filter(({ isMoveToBacklog }) => isMoveToBacklog),
      map(({ task }) => {
        if (!task.projectId) {
          throw new Error('Move to backlog not possible for non project tasks');
        }
        return moveProjectTaskToBacklogListAuto({
          taskId: task.id,
          projectId: task.projectId,
        });
      }),
    ),
  );

  updateTaskReminder$ = createEffect(() =>
    this._actions$.pipe(
      ofType(reScheduleTaskWithTime),
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
      mergeMap(({ task, remindAt, dueWithTime, isMoveToBacklog }) => {
        if (isMoveToBacklog && !task.projectId) {
          throw new Error('Move to backlog not possible for non project tasks');
        }
        if (typeof remindAt !== 'number') {
          return EMPTY;
        }

        return [
          ...(isMoveToBacklog
            ? [
                moveProjectTaskToBacklogListAuto({
                  taskId: task.id,
                  projectId: task.projectId as string,
                }),
              ]
            : []),
        ];
      }),
    ),
  );

  removeTaskReminder$ = createEffect(() =>
    this._actions$.pipe(
      ofType(unScheduleTask, removeReminderFromTask),
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
            changes: { reminderId: undefined, dueWithTime: undefined },
          },
        });
      }),
    ),
  );
  removeTaskReminder2$ = createEffect(() =>
    this._actions$.pipe(
      ofType(planTaskForToday),
      concatMap(({ taskId }) => this._taskService.getByIdOnce$(taskId)),
      filter(({ reminderId }) => !!reminderId),
      map(({ id, reminderId }) => {
        this._reminderService.removeReminder(reminderId as string);
        return updateTask({
          task: {
            id,
            changes: { reminderId: undefined, dueWithTime: undefined },
          },
        });
      }),
    ),
  );

  clearRemindersOnDelete$ = createEffect(
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

  clearRemindersForArchivedTasks$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveToArchive_),
        tap(({ tasks }) => {
          const flatTasks = flattenTasks(tasks);
          if (!flatTasks.length) {
            return;
          }
          flatTasks
            .filter((t) => !!t.reminderId)
            .forEach((t) => {
              if (!t.reminderId) {
                throw new Error('No t.reminderId');
              }
              this._reminderService.removeReminder(t.reminderId);
            });
        }),
      ),
    { dispatch: false },
  );
  clearMultipleReminders = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteTasks),
        tap(({ taskIds }) => {
          this._reminderService.removeRemindersByRelatedIds(taskIds);
        }),
      ),
    { dispatch: false },
  );

  unscheduleDoneTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }) => !!task.changes.isDone),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        tap((task) => {
          if (task.reminderId) {
            // TODO refactor to map with dispatch
            this._store.dispatch(
              unScheduleTask({
                id: task.id,
                reminderId: task.reminderId,
              }),
            );
          }
        }),
      ),
    { dispatch: false },
  );

  unschedulePlannedForDayTasks$ = createEffect(() =>
    this._actions$.pipe(
      ofType(PlannerActions.transferTask),
      filter(({ task }) => !!task.reminderId),
      // delay(100),
      map(({ task }) => {
        return removeReminderFromTask({
          id: task.id,
          reminderId: task.reminderId!,
          isSkipToast: true,
        });
      }),
    ),
  );
}
