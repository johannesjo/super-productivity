import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskWithSubTasks, TimeSpentOnDay } from '../task.model';
import { TaskState } from './task.reducer';
import { Tick } from '../../core/time-tracking/time-tracking';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';

export enum TaskActionTypes {
  LoadState = '[Task] Load Task State',
  SetCurrentTask = '[Task] SetCurrentTask',
  UnsetCurrentTask = '[Task] UnsetCurrentTask',

  // Task Actions
  AddTask = '[Task][Issue] Add Task',
  UpdateTask = '[Task] Update Task',
  UpdateTasks = '[Task] Update Tasks',
  DeleteTask = '[Task] Delete Task',
  MoveAfter = '[Task] Move After',
  AddTimeSpent = '[Task] Add time spent',

  // Sub Task Actions
  AddSubTask = '[Task] Add SubTask',
}

export class LoadState implements Action {
  readonly type = TaskActionTypes.LoadState;

  constructor(public payload: { state: TaskState }) {
  }
}

export class SetCurrentTask implements Action {
  readonly type = TaskActionTypes.SetCurrentTask;

  constructor(public payload: any) {
  }
}

export class UnsetCurrentTask implements Action {
  readonly type = TaskActionTypes.UnsetCurrentTask;
}

export class AddTask implements Action {
  readonly type = TaskActionTypes.AddTask;

  constructor(public payload: { task: Task, issue?: JiraIssue, isAddToBacklog: boolean }) {
  }
}

export class UpdateTask implements Action {
  readonly type = TaskActionTypes.UpdateTask;

  constructor(public payload: { task: Update<Task> }) {
  }
}

export class UpdateTasks implements Action {
  readonly type = TaskActionTypes.UpdateTasks;

  constructor(public payload: { tasks: Update<Task>[] }) {
  }
}

export class DeleteTask implements Action {
  readonly type = TaskActionTypes.DeleteTask;

  constructor(public payload: { id: string }) {
  }
}

export class MoveAfter implements Action {
  readonly type = TaskActionTypes.MoveAfter;

  constructor(public payload: { taskId: string, targetItemId }) {
  }
}

export class AddTimeSpent implements Action {
  readonly type = TaskActionTypes.AddTimeSpent;

  constructor(public payload: { taskId: string, tick: Tick }) {
  }
}

export class AddSubTask implements Action {
  readonly type = TaskActionTypes.AddSubTask;

  constructor(public payload: { task: Task, parentId: string }) {
  }
}

export type TaskActions
  = LoadState
  | SetCurrentTask
  | UnsetCurrentTask
  | AddTask
  | UpdateTask
  | UpdateTasks
  | DeleteTask
  | MoveAfter
  | AddTimeSpent
  | AddSubTask;

