import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {
  AddTaskReminder,
  DeleteTask,
  RemoveTaskReminder,
  TaskActionTypes,
  UpdateTask,
  UpdateTaskReminder
} from './task.actions';
import {Store} from '@ngrx/store';
import {map, mergeMap, tap} from 'rxjs/operators';
import {ReminderService} from '../../reminder/reminder.service';
import {truncate} from '../../../util/truncate';
import {T} from '../../../t.const';
import {SnackService} from '../../../core/snack/snack.service';
import {moveTaskToBacklogListAuto} from '../../work-context/store/work-context-meta.actions';
import {WorkContextService} from '../../work-context/work-context.service';

@Injectable()
export class TaskReminderEffects {

  @Effect()
  addTaskReminder$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.AddTaskReminder,
    ),
    tap((a: AddTaskReminder) => this._snackService.open({
      type: 'SUCCESS',
      translateParams: {
        title: truncate(a.payload.title)
      },
      msg: T.F.TASK.S.REMINDER_ADDED,
      ico: 'schedule',
    })),
    mergeMap((a: AddTaskReminder) => {
      const {id, title, remindAt, isMoveToBacklog} = a.payload;
      const reminderId = this._reminderService.addReminder('TASK', id, title, remindAt);


      return [
        new UpdateTask({
          task: {id, changes: {reminderId}}
        }),
        ...(isMoveToBacklog
            ? [moveTaskToBacklogListAuto({
              taskId: id,
              workContextId: this._workContextService.activeWorkContextId
            })]
            : []
        ),
      ];
    })
  );

  @Effect({dispatch: false})
  updateTaskReminder$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.UpdateTaskReminder,
    ),
    tap((a: UpdateTaskReminder) => {
      const {title, remindAt, reminderId} = a.payload;
      this._reminderService.updateReminder(reminderId, {
        remindAt,
        title,
      });
    }),
    tap((a: UpdateTaskReminder) => this._snackService.open({
      type: 'SUCCESS',
      translateParams: {
        title: truncate(a.payload.title)
      },
      msg: T.F.TASK.S.REMINDER_UPDATED,
      ico: 'schedule',
    })),
  );

  @Effect()
  removeTaskReminder$: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.RemoveTaskReminder,
    ),
    map((a: RemoveTaskReminder) => {
      const {id, reminderId} = a.payload;
      this._reminderService.removeReminder(reminderId);

      return new UpdateTask({
        task: {
          id,
          changes: {reminderId: null}
        }
      });
    }),
    tap(() => this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.TASK.S.REMINDER_DELETED,
      ico: 'schedule',
    })),
  );

  @Effect({dispatch: false})
  clearReminders: any = this._actions$.pipe(
    ofType(
      TaskActionTypes.DeleteTask,
    ),
    tap((a: DeleteTask) => {
      const deletedTaskIds = [a.payload.task.id, ...a.payload.task.subTaskIds];
      deletedTaskIds.forEach((id) => {
        this._reminderService.removeReminderByRelatedIdIfSet(id);
      });
    })
  );


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _reminderService: ReminderService,
    private _snackService: SnackService,
    private _workContextService: WorkContextService,
  ) {
  }
}


