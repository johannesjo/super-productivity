import { Injectable } from '@angular/core';
// import 'rxjs/add/operator/map';
// import 'rxjs/add/operator/catch';
// import 'rxjs/add/operator/startWith';
// import 'rxjs/add/operator/switchMap';
// import 'rxjs/add/operator/mergeMap';
// import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/withLatestFrom';
import { SYNC } from "./task.actions";
import { ADD_TASK } from './task.actions';
import { UPDATE_TASK } from './task.actions';
import { DELETE_TASK } from './task.actions';
import { SET_TASK_DONE } from './task.actions';
import { SET_TASK_UNDONE } from './task.actions';
import { ADD_SUB_TASK } from './task.actions';
import { SET_CURRENT_TASK } from './task.actions';
import { UNSET_CURRENT_TASK } from './task.actions';

import { LS_CURRENT_TASK, LS_TASKS } from '../app.constants'
import { Effect } from '@ngrx/effects';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';


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
  constructor(private actions$: Actions,
              private store$: Store<any>) {
  }

  @Effect({dispatch: false}) addTask$: any = this.actions$
    .ofType(ADD_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) updateTask$: any = this.actions$
    .ofType(UPDATE_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) deleteTask$: any = this.actions$
    .ofType(DELETE_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) setTaskDone$: any = this.actions$
    .ofType(SET_TASK_DONE)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) setTaskUnDone$: any = this.actions$
    .ofType(SET_TASK_UNDONE)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) addSubTask$: any = this.actions$
    .ofType(ADD_SUB_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) sync$: any = this.actions$
    .ofType(SYNC)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) setCurrentTask$: any = this.actions$
    .ofType(SET_CURRENT_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);

  @Effect({dispatch: false}) unsetCurrentTask$: any = this.actions$
    .ofType(UNSET_CURRENT_TASK)
    .withLatestFrom(this.store$)
    .do(syncToLs);
}