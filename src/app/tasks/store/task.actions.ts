import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { DropListModelSource, Task } from '../task.model';
import { TaskState } from './task.reducer';
import { JiraIssue } from '../../issue/jira/jira-issue/jira-issue.model';
import { IssueData } from '../../issue/issue';

export enum TaskActionTypes {
  LoadTaskState = '[Task] Load Task State',
  SetCurrentTask = '[Task] SetCurrentTask',
  UnsetCurrentTask = '[Task] UnsetCurrentTask',

  // Task Actions
  AddTask = '[Task][Issue] Add Task',
  UpdateTaskUi = '[Task] Update Task Ui',
  UpdateTask = '[Task] Update Task',
  UpdateTasks = '[Task] Update Tasks',
  DeleteTask = '[Task] Delete Task',
  UndoDeleteTask = '[Task] Undo Delete Task',
  Move = '[Task] Move task',
  MoveUp = '[Task] Move up',
  MoveDown = '[Task] Move down',
  AddTimeSpent = '[Task] Add time spent',
  RemoveTimeSpent = '[Task] Remove time spent',

  // Sub Task Actions
  AddSubTask = '[Task] Add SubTask',

  // Other
  FocusTask = '[Task] Focus Task',
  FocusLastActiveTask = '[Task] Focus last active Task',
  MoveToBacklog = '[Task] Move to backlog',
  MoveToToday = '[Task] Move to today',
  MoveToArchive = '[Task] Move to archive',
  ToggleStart = '[Task] Toggle start',
}

export class LoadTaskState implements Action {
  readonly type = TaskActionTypes.LoadTaskState;

  constructor(public payload: { state: TaskState }) {
  }
}

export class SetCurrentTask implements Action {
  readonly type = TaskActionTypes.SetCurrentTask;

  constructor(public payload: string) {
  }
}

export class UnsetCurrentTask implements Action {
  readonly type = TaskActionTypes.UnsetCurrentTask;
}

export class AddTask implements Action {
  readonly type = TaskActionTypes.AddTask;

  constructor(public payload: {
    task: Task, issue?: IssueData, isAddToBacklog: boolean, isAddToBottom: boolean,
  }) {
  }
}

export class UpdateTask implements Action {
  readonly type = TaskActionTypes.UpdateTask;

  constructor(public payload: { task: Update<Task> }) {
  }
}

export class UpdateTaskUi implements Action {
  readonly type = TaskActionTypes.UpdateTaskUi;

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

export class UndoDeleteTask implements Action {
  readonly type = TaskActionTypes.UndoDeleteTask;
}

export class Move implements Action {
  readonly type = TaskActionTypes.Move;

  constructor(public payload: {
    taskId: string,
    sourceModelId: DropListModelSource,
    targetModelId: DropListModelSource,
    newOrderedIds: string[]
  }) {
  }
}

export class MoveUp implements Action {
  readonly type = TaskActionTypes.MoveUp;

  constructor(public payload: { id: string }) {
  }
}

export class MoveDown implements Action {
  readonly type = TaskActionTypes.MoveDown;

  constructor(public payload: { id: string }) {
  }
}

export class AddTimeSpent implements Action {
  readonly type = TaskActionTypes.AddTimeSpent;

  constructor(public payload: { id: string, date: string, duration: number }) {
  }
}

export class RemoveTimeSpent implements Action {
  readonly type = TaskActionTypes.RemoveTimeSpent;

  constructor(public payload: { id: string, date: string, duration: number }) {
  }
}

export class FocusTask implements Action {
  readonly type = TaskActionTypes.FocusTask;

  constructor(public payload: { id: string }) {
  }
}

export class FocusLastActiveTask implements Action {
  readonly type = TaskActionTypes.FocusLastActiveTask;
}

export class AddSubTask implements Action {
  readonly type = TaskActionTypes.AddSubTask;

  constructor(public payload: { task: Task, parentId: string }) {
  }
}

export class MoveToBacklog implements Action {
  readonly type = TaskActionTypes.MoveToBacklog;

  constructor(public payload: { id: string }) {
  }
}

export class MoveToToday implements Action {
  readonly type = TaskActionTypes.MoveToToday;

  constructor(public payload: { id: string }) {
  }
}

export class MoveToArchive implements Action {
  readonly type = TaskActionTypes.MoveToArchive;

  constructor(public payload: { ids: string[] }) {
  }
}
export class ToggleStart implements Action {
  readonly type = TaskActionTypes.ToggleStart;
}

export type TaskActions
  = LoadTaskState
  | SetCurrentTask
  | UnsetCurrentTask
  | AddTask
  | UpdateTaskUi
  | UpdateTask
  | UpdateTasks
  | DeleteTask
  | UndoDeleteTask
  | Move
  | MoveUp
  | MoveDown
  | AddTimeSpent
  | RemoveTimeSpent
  | FocusTask
  | FocusLastActiveTask
  | AddSubTask
  | MoveToBacklog
  | MoveToToday
  | ToggleStart
  | MoveToArchive;

