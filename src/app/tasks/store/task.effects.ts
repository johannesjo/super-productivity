import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { DeleteTask, TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { selectTaskFeatureState } from './task.selectors';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { SnackOpen } from '../../core/snack/store/snack.actions';
import { TaskState } from './task.reducer';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskEffects {
  @Effect({dispatch: false}) moveToArchive$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.MoveToArchive,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._moveToArchive.bind(this))
    );


  @Effect({dispatch: false}) updateTask$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.UndoDeleteTask,
        TaskActionTypes.AddSubTask,
        TaskActionTypes.SetCurrentTask,
        TaskActionTypes.UnsetCurrentTask,
        TaskActionTypes.UpdateTask,
        TaskActionTypes.Move,
        TaskActionTypes.MoveToArchive,
        TaskActionTypes.MoveToBacklog,
        TaskActionTypes.MoveToToday,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect() snackDelete$: any = this._actions$
    .pipe(
      ofType(
        TaskActionTypes.DeleteTask,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectTaskFeatureState)),
      ),
      map(([action_, state]) => {
        const action = action_ as DeleteTask;
        return new SnackOpen({
          message: `Deleted task "${state.stateBefore.entities[action.payload.id].title}"`,
          config: {duration: 5000},
          actionStr: 'Undo',
          actionId: TaskActionTypes.UndoDeleteTask
        });
      })
    );

  constructor(private _actions$: Actions,
              private _store$: Store<any>,
              private _persistenceService: PersistenceService) {
  }

  private _saveToLs([action, currentProjectId, taskState]) {
    if (currentProjectId) {
      this._persistenceService.saveTasksForProject(currentProjectId, taskState);
    } else {
      throw new Error('No current project id');
    }
  }

  private _moveToArchive([action, currentProjectId, taskState]) {
    const mainTaskIds = action.payload.ids;
    const stateBefore: TaskState = taskState.stateBefore;
    const archive = {
      entities: {},
      ids: []
    };
    mainTaskIds.forEach((id) => {
      const task = stateBefore.entities[id];
      archive.entities[id] = task;
      archive.ids.push(id);
      task.subTaskIds.forEach((subId) => {
        archive.entities[subId] = stateBefore.entities[subId];
        archive.ids.push(subId);
      });
    });

    this._persistenceService.saveToTaskArchiveForProject(currentProjectId, archive);
  }
}


