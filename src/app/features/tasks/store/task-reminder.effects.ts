import { inject, Injectable } from '@angular/core';
import { createEffect, ofType } from '@ngrx/effects';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { concatMap, filter, map, mergeMap, tap } from 'rxjs/operators';
import { truncate } from '../../../util/truncate';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { EMPTY } from 'rxjs';
import { TaskService } from '../task.service';
import { moveProjectTaskToBacklogListAuto } from '../../project/store/project.actions';
import { Store } from '@ngrx/store';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';

@Injectable()
export class TaskReminderEffects {
  private _localActions$ = inject(LOCAL_ACTIONS);
  private _snackService = inject(SnackService);
  private _taskService = inject(TaskService);
  private _store = inject(Store);
  private _datePipe = inject(LocaleDatePipe);

  snack$ = createEffect(
    () =>
      this._localActions$.pipe(
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

  updateTaskReminderSnack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.reScheduleTaskWithTime),
        filter(({ remindAt }) => typeof remindAt === 'number'),
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
      ),
    { dispatch: false },
  );

  autoMoveToBacklogOnReschedule$ = createEffect(() =>
    this._actions$.pipe(
      ofType(TaskSharedActions.reScheduleTaskWithTime),
      filter(({ isMoveToBacklog }) => isMoveToBacklog),
      mergeMap(({ task, isMoveToBacklog }) => {
        if (!task.projectId) {
          return EMPTY;
        }
        return [
          moveProjectTaskToBacklogListAuto({
            taskId: task.id,
            projectId: task.projectId,
          }),
        ];
      }),
    ),
  );

  unscheduleDoneTask$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.updateTask),
        filter(({ task }) => !!task.changes.isDone),
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        tap((task) => {
          if (task?.remindAt) {
            this._store.dispatch(
              TaskSharedActions.unscheduleTask({
                id: task.id,
              }),
            );
          }
        }),
      ),
    { dispatch: false },
  );

  unscheduleSnack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.unscheduleTask),
        filter(({ isSkipToast }) => !isSkipToast),
        tap(() => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.TASK.S.REMINDER_DELETED,
            ico: 'schedule',
          });
        }),
      ),
    { dispatch: false },
  );

  dismissReminderSnack$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskSharedActions.dismissReminderOnly),
        tap(() => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.TASK.S.REMINDER_DELETED,
            ico: 'schedule',
          });
        }),
      ),
    { dispatch: false },
  );
}
