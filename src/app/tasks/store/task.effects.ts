import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/withLatestFrom';
import { withLatestFrom } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { TASK_FEATURE_NAME } from '../task.const';
import { ProjectService } from '../../project/project.service';

@Injectable()
export class TaskEffects {
  @Effect({dispatch: false}) updateTask$: any = this.actions$
    .pipe(
      ofType(
        TaskActionTypes.AddTask,
        TaskActionTypes.DeleteTask,
        TaskActionTypes.AddSubTask,
        TaskActionTypes.SetCurrentTask,
        TaskActionTypes.UnsetCurrentTask,
        TaskActionTypes.UpdateTask,
      ),
      withLatestFrom(this.store$),
      tap(this._saveToLs.bind(this))
    );

  constructor(private actions$: Actions,
              private store$: Store<any>,
              private _projectService: ProjectService) {
  }

  private _saveToLs(state) {
    const tasksFeatureState = state[1][TASK_FEATURE_NAME];
    const currentTaskId = tasksFeatureState.currentTaskId;
    console.log('SYNC', tasksFeatureState, currentTaskId);
    this._projectService.saveTasksForCurrentProject(tasksFeatureState);
  }
}


