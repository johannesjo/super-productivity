import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { TaskActionTypes } from './task.actions';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/withLatestFrom';

import { LS_CURRENT_TASK, LS_TASKS } from '../../app.constants';

// helper fn
function syncToLs(state) {
  const stateReducer = state[1];
  const tasks = stateReducer.TaskReducer;
  const currentTask = stateReducer.CurrentTaskReducer;
  localStorage.setItem(LS_TASKS, JSON.stringify(tasks));
  localStorage.setItem(LS_CURRENT_TASK, currentTask);
  console.log('SYNC', tasks, currentTask);
}

@Injectable()
export class TaskEffects {
  // we're using n interval instead for better performance
  //
  // @Effect({dispatch: false}) addTask$: any = this.actions$
  //   .ofType(TaskActionTypes.AddTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) updateTask$: any = this.actions$
  //   .ofType(TaskActionTypes.UpdateTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) deleteTask$: any = this.actions$
  //   .ofType(TaskActionTypes.DeleteTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) setTaskDone$: any = this.actions$
  //   .ofType(TaskActionTypes.SetTaskDone)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) setTaskUnDone$: any = this.actions$
  //   .ofType(TaskActionTypes.SetTaskUndone)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) addSubTask$: any = this.actions$
  //   .ofType(TaskActionTypes.AddSubTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) sync$: any = this.actions$
  //   .ofType(TaskActionTypes.Sync)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) setCurrentTask$: any = this.actions$
  //   .ofType(TaskActionTypes.SetCurrentTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);
  // @Effect({dispatch: false}) unsetCurrentTask$: any = this.actions$
  //   .ofType(TaskActionTypes.UnsetCurrentTask)
  //   .withLatestFrom(this.store$)
  //   .do(syncToLs);

  constructor(private actions$: Actions,
              private store$: Store<any>) {
  }
}


