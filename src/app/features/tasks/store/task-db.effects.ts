import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectTaskFeatureState } from './task.selectors';
import { TaskState } from '../task.model';
import { environment } from '../../../../environments/environment';
import { addTaskRepeatCfgToTask } from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import {
  addTaskAttachment,
  deleteTaskAttachment,
  updateTaskAttachment,
} from '../task-attachment/task-attachment.actions';

@Injectable()
export class TaskDbEffects {
  updateTask$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          TaskActionTypes.AddTask,
          TaskActionTypes.RestoreTask,
          TaskActionTypes.AddTimeSpent,
          TaskActionTypes.UnScheduleTask,
          TaskActionTypes.DeleteTask,
          TaskActionTypes.DeleteMainTasks,
          TaskActionTypes.UndoDeleteTask,
          TaskActionTypes.AddSubTask,
          TaskActionTypes.ConvertToMainTask,
          // TaskActionTypes.SetCurrentTask,
          // TaskActionTypes.UnsetCurrentTask,
          TaskActionTypes.UpdateTask,
          TaskActionTypes.UpdateTaskTags,
          TaskActionTypes.RemoveTagsForAllTasks,
          TaskActionTypes.MoveSubTask,
          TaskActionTypes.MoveSubTaskUp,
          TaskActionTypes.MoveSubTaskDown,
          TaskActionTypes.MoveToArchive,
          TaskActionTypes.MoveToOtherProject,
          TaskActionTypes.ToggleStart,
          TaskActionTypes.RoundTimeSpentForDay,

          // REMINDER
          TaskActionTypes.ScheduleTask,
          TaskActionTypes.ReScheduleTask,
          TaskActionTypes.UnScheduleTask,

          // ATTACHMENT ACTIONS
          addTaskAttachment,
          deleteTaskAttachment,
          updateTaskAttachment,

          // RELATED ACTIONS
          addTaskRepeatCfgToTask,
        ),
        withLatestFrom(this._store$.pipe(select(selectTaskFeatureState))),
        tap(([, taskState]) => this._saveToLs(taskState, true)),
      ),
    { dispatch: false },
  );

  updateTaskUi$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(TaskActionTypes.UpdateTaskUi, TaskActionTypes.ToggleTaskShowSubTasks),
        withLatestFrom(this._store$.pipe(select(selectTaskFeatureState))),
        tap(([, taskState]) => this._saveToLs(taskState)),
      ),
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {}

  // @debounce(50)
  private _saveToLs(taskState: TaskState, isSyncModelChange: boolean = false): void {
    this._persistenceService.task.saveState(
      {
        ...taskState,

        // make sure those are never set to something
        selectedTaskId: environment.production ? null : taskState.selectedTaskId,
        currentTaskId: null,
      },
      { isSyncModelChange },
    );
  }
}
