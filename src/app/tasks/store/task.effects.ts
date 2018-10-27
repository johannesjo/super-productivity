import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { select, Store } from '@ngrx/store';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { selectTaskFeatureState } from './task.selectors';
import { selectCurrentProjectId } from '../../project/store/project.reducer';
import { SnackOpen } from '../../core/snack/store/snack.actions';

// TODO send message to electron when current task changes here

@Injectable()
export class TaskEffects {
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
      map(([action, state]) => new SnackOpen({
        message: `Deleted task "${state.stateBeforeDeletion.entities[action.payload.id].title}"`,
        actionStr: 'Undo',
        actionId: TaskActionTypes.UndoDeleteTask
      }))
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
}


