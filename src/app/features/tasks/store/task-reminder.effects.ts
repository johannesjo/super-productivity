import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { addReminderIdToTask, removeReminderFromTask } from './task.actions';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { concatMap, filter, first, map, mergeMap, tap } from 'rxjs/operators';
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
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';

@Injectable()
export class TaskReminderEffects {
  private _actions$ = inject(Actions);
  private _reminderService = inject(ReminderService);
  private _snackService = inject(SnackService);
  private _taskService = inject(TaskService);
  private _store = inject(Store);
  private _datePipe = inject(LocaleDatePipe);

  snack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.scheduleTaskWithTime),
        tap(({ task, remindAt, dueWithTime }) => {
          const formattedDate = this._datePipe.transform(dueWithTime, 'short');
          this._snackService.open({
            type: 'SUCCESS',
            translateParams: {
              title: truncate(task.title),
              date: formattedDate || '',
            },
            msg: T.F.TASK.S.REMINDER_ADDED,
            ico: remindAt ? 'alarm' : 'schedule',
          });
        }),
      ),
    { dispatch: false },
  );

  createReminderAndAddToTask$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.scheduleTaskWithTime),
      filter(({ task, remindAt }) => typeof remindAt === 'number'),
      map(({ task, remindAt }) => {
        const reminderId = this._reminderService.addReminder(
          'TASK',
          task.id,
          truncate(task.title),
          remindAt as number,
          undefined,
          true,
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
      ofType(TaskSharedActions.scheduleTaskWithTime),
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
      ofType(TaskSharedActions.reScheduleTaskWithTime),
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

  clearRemindersOnDelete$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.deleteTask),
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
        ofType(TaskSharedActions.moveToArchive),
        tap(({ tasks }) => {
          const flatTasks = flattenTasks(tasks);
          if (!flatTasks.length) {
            return;
          }
          flatTasks.forEach((t) => {
            if (t.reminderId) {
              this._reminderService.removeReminder(t.reminderId);
            }
          });
        }),
      ),
    { dispatch: false },
  );
  clearMultipleReminders = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.deleteTasks),
        tap(({ taskIds }) => {
          this._reminderService.removeRemindersByRelatedIds(taskIds);
        }),
      ),
    { dispatch: false },
  );

  unscheduleDoneTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.updateTask),
        filter(({ task }) => !!task.changes.isDone),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        tap((task) => {
          if (task.reminderId) {
            // TODO refactor to map with dispatch
            this._store.dispatch(
              TaskSharedActions.unscheduleTask({
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

  // ---------------------------------------
  // ---------------------------------------
  removeTaskReminderSideEffects$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(removeReminderFromTask),
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
        tap(({ id, reminderId }) => {
          this._reminderService.removeReminder(reminderId as string);
        }),
      ),
    { dispatch: false },
  );
  removeTaskReminderTrigger1$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.planTasksForToday),
      filter(({ isSkipRemoveReminder }) => !isSkipRemoveReminder),
      concatMap(({ taskIds }) => this._taskService.getByIdsLive$(taskIds).pipe(first())),
      mergeMap((tasks) =>
        tasks
          .filter((task) => !!task.reminderId)
          .map((task) =>
            removeReminderFromTask({
              id: task.id,
              reminderId: task.reminderId as string,
              isSkipToast: true,
            }),
          ),
      ),
    ),
  );
  removeTaskReminderTrigger2$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.unscheduleTask),
      filter(({ reminderId }) => !!reminderId),
      map(({ id, reminderId }) => {
        return removeReminderFromTask({
          id,
          reminderId: reminderId as string,
          isSkipToast: true,
        });
      }),
    ),
  );

  removeTaskReminderForDismissOnly$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.dismissReminderOnly),
      map(({ id, reminderId }) => {
        return removeReminderFromTask({
          id,
          reminderId: reminderId,
          isSkipToast: false,
        });
      }),
    ),
  );

  removeTaskReminderTrigger3$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(PlannerActions.planTaskForDay),
      filter(({ task, day }) => !!task.reminderId),
      map(({ task }) => {
        return removeReminderFromTask({
          id: task.id,
          reminderId: task.reminderId as string,
          isSkipToast: true,
        });
      }),
    );
  });
}
