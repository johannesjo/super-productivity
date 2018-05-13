import {Injectable} from '@angular/core';
import {Observable} from 'rxjs'
import {Task} from './task'
import {Store} from '@ngrx/store';
import {
  ADD_SUB_TASK,
  ADD_TASK,
  DELETE_TASK,
  RELOAD_FROM_LS,
  SET_CURRENT_TASK,
  SET_TASK_DONE,
  SET_TASK_UNDONE,
  SYNC,
  UNSET_CURRENT_TASK,
  UPDATE_TASK,
} from './task.actions';


@Injectable()
export class TaskService {
  tasks$: Observable<Array<Task>>;
  currentTask$: Observable<string>;

  constructor(
    private _store: Store<any>
  ) {
    this.tasks$ = this._store.select(state => state.TaskReducer);
    this.currentTask$ = this._store.select(state => state.CurrentTaskReducer);
    this.reloadFromLs();
  }

  reloadFromLs() {
    this._store.dispatch({
      type: RELOAD_FROM_LS
    });
  }

  sync() {
    this._store.dispatch({
      type: SYNC
    });
  }

  addTask(title: string) {
    this._store.dispatch({
      type: ADD_TASK,
      payload: {
        title,
        isDone: false
      }
    });
  }

  deleteTask(taskId: string) {
    this._store.dispatch({
      type: DELETE_TASK,
      payload: taskId
    });
  }


  updateTask(taskId: string, changedFields: any) {
    this._store.dispatch({
      type: UPDATE_TASK,
      payload: {
        id: taskId,
        changedFields: changedFields
      }
    });
  }

  setCurrentTask(taskId: string) {
    this._store.dispatch({
      type: SET_CURRENT_TASK,
      payload: taskId,
    });
  }

  pauseCurrentTask() {
    this._store.dispatch({
      type: UNSET_CURRENT_TASK,
    });
  }

  setTaskDone(taskId: string) {
    this._store.dispatch({
      type: SET_TASK_DONE,
      payload: taskId,
    });
  }

  setTaskUnDone(taskId: string) {
    this._store.dispatch({
      type: SET_TASK_UNDONE,
      payload: taskId,
    });
  }


  addSubTask(parentTask: Task) {
    this._store.dispatch({
      type: ADD_SUB_TASK,
      payload: parentTask
    });
  }
}