import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Task } from './task';
import { Store } from '@ngrx/store';
import 'rxjs/add/operator/map';
import { selectTasks } from './store/task.selectors';
import { selectCurrentTask } from './store/task.selectors';
import { TaskActionTypes } from './store/task.actions';
import { select } from '@ngrx/store';


@Injectable()
export class TaskService {
  currentTask$: Observable<string> = this._store.pipe(select(selectCurrentTask));
  tasks$: Observable<Task[]> = this._store.pipe(select(selectTasks));
  undoneTasks$: Observable<Task[]> = this.tasks$.map((tasks) => tasks && tasks.filter((task: Task) => !task.isDone));
  doneTasks$: Observable<Task[]> = this.tasks$.map((tasks) => tasks && tasks.filter((task: Task) => task.isDone));

  constructor(
    private _store: Store<any>
  ) {
    // TODO find out why this gets initialized multiple times
    console.log('SERVICE constructor');

    this.reloadFromLs();
  }

  reloadFromLs() {
    this._store.dispatch({
      type: TaskActionTypes.ReloadFromLs
    });
  }

  sync() {
    this._store.dispatch({
      type: TaskActionTypes.Sync
    });
  }

  addTask(title: string) {
    this._store.dispatch({
      type: TaskActionTypes.AddTask,
      payload: {
        title,
        isDone: false
      }
    });
  }

  deleteTask(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.DeleteTask,
      payload: taskId
    });
  }


  updateTask(taskId: string, changedFields: any) {
    this._store.dispatch({
      type: TaskActionTypes.UpdateTask,
      payload: {
        id: taskId,
        changedFields: changedFields
      }
    });
  }

  setCurrentTask(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.SetCurrentTask,
      payload: taskId,
    });
  }

  pauseCurrentTask() {
    this._store.dispatch({
      type: TaskActionTypes.UnsetCurrentTask,
    });
  }

  setTaskDone(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.SetTaskDone,
      payload: taskId,
    });
  }

  setTaskUnDone(taskId: string) {
    this._store.dispatch({
      type: TaskActionTypes.SetTaskUndone,
      payload: taskId,
    });
  }


  addSubTask(parentTask: Task) {
    this._store.dispatch({
      type: TaskActionTypes.AddSubTask,
      payload: parentTask
    });
  }
}
