import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectTaskFeatureState } from './task.selectors';
import { TaskRepeatCfgActionTypes } from '../../task-repeat-cfg/store/task-repeat-cfg.actions';
import { TaskAttachmentActionTypes } from '../task-attachment/task-attachment.actions';
import { TaskState } from '../task.model';

@Injectable()
export class TaskDbEffects {
  @Effect({dispatch: false}) updateTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.RestoreTask,
        TaskActionTypes.AddTimeSpent,
        TaskActionTypes.RemoveTaskReminder,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.DeleteMainTasks,
        TaskActionTypes.UndoDeleteTask,
        TaskActionTypes.AddSubTask,
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

        // SUB ACTIONS
        TaskAttachmentActionTypes.AddTaskAttachment,
        TaskAttachmentActionTypes.DeleteTaskAttachment,
        TaskAttachmentActionTypes.UpdateTaskAttachment,

        // RELATED ACTIONS
        TaskRepeatCfgActionTypes.AddTaskRepeatCfgToTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(([, taskState]) => this._saveToLs(taskState)),
      tap(this._updateLastLocalSyncModelChange.bind(this)),
    );

  @Effect({dispatch: false}) updateTaskUi$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.UpdateTaskUi,
        TaskActionTypes.ToggleTaskShowSubTasks,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(([, taskState]) => this._saveToLs(taskState)),
    );

  constructor(private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService) {
  }

  private _updateLastLocalSyncModelChange() {
    this._persistenceService.updateLastLocalSyncModelChange();
  }

  private _saveToLs(taskState: TaskState) {
    this._persistenceService.task.saveState(taskState);
  }
}


