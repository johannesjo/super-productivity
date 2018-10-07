import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task } from '../task.model';
import { TaskState } from './task.reducer';

export enum TaskActionTypes {
  LoadState = '[Task] Load Task State',
  SetCurrentTask = '[Task] SetCurrentTask',
  UnsetCurrentTask = '[Task] UnsetCurrentTask',

  // Task Actions
  LoadTasks = '[Task] Load Tasks',
  AddTask = '[Task] Add Task',
  AddTasks = '[Task] Add Tasks',
  UpdateTask = '[Task] Update Task',
  UpdateTasks = '[Task] Update Tasks',
  DeleteTask = '[Task] Delete Task',
  DeleteTasks = '[Task] Delete Tasks',
  ClearTasks = '[Task] Clear Tasks',
  MoveAfter = '[Task] Move After',
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

export class LoadTasks implements Action {
  readonly type = TaskActionTypes.LoadTasks;

  constructor(public payload: { tasks: Task[] }) {
  }
}

export class AddTask implements Action {
  readonly type = TaskActionTypes.AddTask;

  constructor(public payload: { task: Task }) {
  }
}

export class AddTasks implements Action {
  readonly type = TaskActionTypes.AddTasks;

  constructor(public payload: { tasks: Task[] }) {
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

export class DeleteTasks implements Action {
  readonly type = TaskActionTypes.DeleteTasks;

  constructor(public payload: { ids: string[] }) {
  }
}

export class ClearTasks implements Action {
  readonly type = TaskActionTypes.ClearTasks;
}

export class MoveAfter implements Action {
  readonly type = TaskActionTypes.MoveAfter;

  constructor(public payload: { taskId: string, targetItemId }) {
  }
}

export type TaskActions
  = LoadTasks
  | LoadState
  | SetCurrentTask
  | UnsetCurrentTask
  | AddTask
  | AddTasks
  | UpdateTask
  | UpdateTasks
  | DeleteTask
  | DeleteTasks
  | ClearTasks
  | MoveAfter;


// export enum TaskActionTypes {
//   LoadTasks = '[Task] Load Tasks',
//   AddTask = '[Task] AddTask',
//   DeleteTask = '[Task] DeleteTask',
//   UpdateTask = '[Task] UpdateTask',
//   ReloadFromLs = '[Task] ReloadFromLs',
//   AddSubTask = '[Task] AddSubTask',
//   Sync = '[Task] Sync',
//   SetTaskDone = '[Task] SetTaskDone',
//   SetTaskUndone = '[Task] SetTaskUndone',
//   GetCurrentTask = '[Task] GetCurrentTask',
//   SetCurrentTask = '[Task] SetCurrentTask',
//   UnsetCurrentTask = '[Task] UnsetCurrentTask',
// }
//
// export class LoadTasks implements Action {
//   readonly type = TaskActionTypes.LoadTasks;
//
//   constructor(public task: Task) {
//   }
// }
//
// export class AddTask implements Action {
//   readonly type = TaskActionTypes.AddTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class DeleteTask implements Action {
//   readonly type = TaskActionTypes.DeleteTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class UpdateTask implements Action {
//   readonly type = TaskActionTypes.UpdateTask;
//
//   constructor(
//     public id: string,
//     public changes: Partial<Task>
//   ) {
//   }
// }
//
// export class ReloadFromLs implements Action {
//   readonly type = TaskActionTypes.ReloadFromLs;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class AddSubTask implements Action {
//   readonly type = TaskActionTypes.AddSubTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class SetTaskDone implements Action {
//   readonly type = TaskActionTypes.SetTaskDone;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class SetTaskUndone implements Action {
//   readonly type = TaskActionTypes.SetTaskUndone;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class GetCurrentTask implements Action {
//   readonly type = TaskActionTypes.GetCurrentTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class SetCurrentTask implements Action {
//   readonly type = TaskActionTypes.SetCurrentTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export class UnsetCurrentTask implements Action {
//   readonly type = TaskActionTypes.UnsetCurrentTask;
//
//   constructor(public payload: any) {
//   }
// }
//
// export type TaskActions
//   = LoadTasks
//   | AddTask
//   | DeleteTask
//   | UpdateTask
//   | ReloadFromLs
//   | AddSubTask
//   | SetTaskDone
//   | SetTaskUndone
//   | GetCurrentTask
//   | SetCurrentTask
//   | UnsetCurrentTask;
