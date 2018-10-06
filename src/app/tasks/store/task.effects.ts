import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/withLatestFrom';

import { LS_TASK } from '../task.const';
import { TASK_FEATURE_NAME } from '../task.const';
import { withLatestFrom } from 'rxjs/operators';
import { tap } from 'rxjs/operators';
import { saveToLs } from '../../util/local-storage';

// helper fn
function syncToLs(state) {
  const tasksFeatureState = state[1][TASK_FEATURE_NAME];
  const currentTaskId = tasksFeatureState.currentTaskId;

  saveToLs(LS_TASK, tasksFeatureState);
  console.log('SYNC', tasksFeatureState, currentTaskId);
}

@Injectable()
export class TaskEffects {
  // we're using n interval instead for better performance

  @Effect({dispatch: false}) addTask$: any = this.actions$
    .pipe(
      ofType(TaskActionTypes.AddTask),
      withLatestFrom(this.store$),
      tap(syncToLs)
    );
  @Effect({dispatch: false}) updateTask$: any = this.actions$
    .pipe(
      ofType(TaskActionTypes.UpdateTask),
      withLatestFrom(this.store$),
      tap(syncToLs)
    );
  @Effect({dispatch: false}) deleteTask$: any = this.actions$
    .pipe(
      ofType(TaskActionTypes.DeleteTask),
      withLatestFrom(this.store$),
      tap(syncToLs)
    );
  // @Effect({dispatch: false}) addSubTask$: any = this.actions$
  //   .pipe(
  //     ofType(TaskActionTypes.AddSubTask),
  //     withLatestFrom(this.store$),
  //     tap(syncToLs)
  //   );
  // @Effect({dispatch: false}) sync$: any = this.actions$
  //   .pipe(
  //     ofType(TaskActionTypes.Sync),
  //     withLatestFrom(this.store$),
  //     tap(syncToLs)
  //   );
  @Effect({dispatch: false}) setCurrentTask$: any = this.actions$
    .pipe(
      ofType(TaskActionTypes.SetCurrentTask),
      withLatestFrom(this.store$),
      tap(syncToLs)
    );
  @Effect({dispatch: false}) unsetCurrentTask$: any = this.actions$
    .pipe(
      ofType(TaskActionTypes.UnsetCurrentTask),
      withLatestFrom(this.store$),
      tap(syncToLs)
    );

  constructor(private actions$: Actions,
              private store$: Store<any>) {
  }
}


