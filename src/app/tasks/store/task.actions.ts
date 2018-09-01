import { Action } from '@ngrx/store';

export enum TaskActionTypes {
  LoadTasks = '[Task] Load Tasks',
  AddTask = '[Task] AddTask',
  DeleteTask = '[Task] DeleteTask',
  UpdateTask = '[Task] UpdateTask',
  ReloadFromLs = '[Task] ReloadFromLs',
  AddSubTask = '[Task] AddSubTask',
  Sync = '[Task] Sync',
  SetTaskDone = '[Task] SetTaskDone',
  SetTaskUndone = '[Task] SetTaskUndone',
  GetCurrentTask = '[Task] GetCurrentTask',
  SetCurrentTask = '[Task] SetCurrentTask',
  UnsetCurrentTask = '[Task] UnsetCurrentTask',
}

export class LoadTasks implements Action {
  readonly type = TaskActionTypes.LoadTasks;

  constructor(public payload: any) {
  }
}

export class AddTask implements Action {
  readonly type = TaskActionTypes.AddTask;

  constructor(public payload: any) {
  }
}

export class DeleteTask implements Action {
  readonly type = TaskActionTypes.DeleteTask;

  constructor(public payload: any) {
  }
}

export class UpdateTask implements Action {
  readonly type = TaskActionTypes.UpdateTask;

  constructor(public payload: any) {
  }
}

export class ReloadFromLs implements Action {
  readonly type = TaskActionTypes.ReloadFromLs;

  constructor(public payload: any) {
  }
}

export class AddSubTask implements Action {
  readonly type = TaskActionTypes.AddSubTask;

  constructor(public payload: any) {
  }
}

export class SetTaskDone implements Action {
  readonly type = TaskActionTypes.SetTaskDone;

  constructor(public payload: any) {
  }
}

export class SetTaskUndone implements Action {
  readonly type = TaskActionTypes.SetTaskUndone;

  constructor(public payload: any) {
  }
}

export class GetCurrentTask implements Action {
  readonly type = TaskActionTypes.GetCurrentTask;

  constructor(public payload: any) {
  }
}

export class SetCurrentTask implements Action {
  readonly type = TaskActionTypes.SetCurrentTask;

  constructor(public payload: any) {
  }
}

export class UnsetCurrentTask implements Action {
  readonly type = TaskActionTypes.UnsetCurrentTask;

  constructor(public payload: any) {
  }
}

export type TaskActions =
  LoadTasks
  | AddTask
  | DeleteTask
  | UpdateTask
  | ReloadFromLs
  | AddSubTask
  | SetTaskDone
  | SetTaskUndone
  | GetCurrentTask
  | SetCurrentTask
  | UnsetCurrentTask;
