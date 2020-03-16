import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {DropListModelSource, Task, TaskAdditionalInfoTargetPanel, TaskState, TaskWithSubTasks} from '../task.model';
import {IssueDataReduced} from '../../issue/issue.model';
import {RoundTimeOption} from '../../project/project.model';
import {WorkContextType} from '../../work-context/work-context.model';

export enum TaskActionTypes {
  LoadTaskState = '[Task] Load Task State',

  SetCurrentTask = '[Task] SetCurrentTask',
  SetSelectedTask = '[Task] SetSelectedTask',
  UnsetCurrentTask = '[Task] UnsetCurrentTask',

  // Task Actions
  AddTask = '[Task][Issue] Add Task',
  UpdateTaskUi = '[Task] Update Task Ui',
  UpdateTaskTags = '[Task] Update Task Tags',
  ToggleTaskShowSubTasks = '[Task] Toggle Show Sub Tasks',
  UpdateTask = '[Task] Update Task',
  UpdateTasks = '[Task] Update Tasks',
  DeleteTask = '[Task] Delete Task',
  UndoDeleteTask = '[Task] Undo Delete Task',
  MoveSubTask = '[Task] Move sub task',
  MoveSubTaskUp = '[Task] Move up',
  MoveSubTaskDown = '[Task] Move down',
  AddTimeSpent = '[Task] Add time spent',
  RemoveTimeSpent = '[Task] Remove time spent',

  // Reminders
  AddTaskReminder = '[Task] Add reminder',
  UpdateTaskReminder = '[Task] Update reminder',
  RemoveTaskReminder = '[Task] Remove reminder',

  // Sub Task Actions
  AddSubTask = '[Task] Add SubTask',

  // Other
  RestoreTask = '[Task] Restore Task',
  MoveToArchive = '[Task] Move to archive',
  MoveToOtherProject = '[Task] Move tasks to other project',
  ToggleStart = '[Task] Toggle start',
  RoundTimeSpentForDay = '[Task] RoundTimeSpentForDay',

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

export class SetSelectedTask implements Action {
  readonly type = TaskActionTypes.SetSelectedTask;

  constructor(public payload: { id: string; taskAdditionalInfoTargetPanel: TaskAdditionalInfoTargetPanel }) {
  }
}

export class UnsetCurrentTask implements Action {
  readonly type = TaskActionTypes.UnsetCurrentTask;
}

export class AddTask implements Action {
  readonly type = TaskActionTypes.AddTask;

  constructor(public payload: {
    task: Task,
    issue?: IssueDataReduced,
    workContextId: string,
    workContextType: WorkContextType,
    isAddToBacklog: boolean,
    isAddToBottom: boolean,
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

export class UpdateTaskTags implements Action {
  readonly type = TaskActionTypes.UpdateTaskTags;

  constructor(public payload: { taskId: string; newTagIds: string[], oldTagIds: string[] }) {
  }
}

export class ToggleTaskShowSubTasks implements Action {
  readonly type = TaskActionTypes.ToggleTaskShowSubTasks;

  constructor(public payload: { taskId: string, isShowLess: boolean, isEndless: boolean }) {
  }
}

export class UpdateTasks implements Action {
  readonly type = TaskActionTypes.UpdateTasks;

  constructor(public payload: { tasks: Update<Task>[] }) {
  }
}

export class DeleteTask implements Action {
  readonly type = TaskActionTypes.DeleteTask;

  constructor(public payload: { task: TaskWithSubTasks }) {
  }
}

export class UndoDeleteTask implements Action {
  readonly type = TaskActionTypes.UndoDeleteTask;
}

export class MoveSubTask implements Action {
  readonly type = TaskActionTypes.MoveSubTask;

  constructor(public payload: {
    taskId: string,
    srcTaskId: string,
    targetTaskId: string,
    newOrderedIds: string[]
  }) {
  }
}

export class MoveSubTaskUp implements Action {
  readonly type = TaskActionTypes.MoveSubTaskUp;

  constructor(public payload: { id: string, parentId: string }) {
  }
}

export class MoveSubTaskDown implements Action {
  readonly type = TaskActionTypes.MoveSubTaskDown;

  constructor(public payload: { id: string, parentId: string }) {
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

// Reminder Actions
export class AddTaskReminder implements Action {
  readonly type = TaskActionTypes.AddTaskReminder;

  constructor(public payload: { id: string, title: string, remindAt: number, isMoveToBacklog: boolean }) {
  }
}

export class UpdateTaskReminder implements Action {
  readonly type = TaskActionTypes.UpdateTaskReminder;

  constructor(public payload: { id: string, title: string, reminderId: string, remindAt: number }) {
  }
}

export class RemoveTaskReminder implements Action {
  readonly type = TaskActionTypes.RemoveTaskReminder;

  constructor(public payload: { id: string, reminderId: string }) {
  }
}

export class RestoreTask implements Action {
  readonly type = TaskActionTypes.RestoreTask;

  constructor(public payload: { task: TaskWithSubTasks, subTasks: Task[] }) {
  }
}

export class AddSubTask implements Action {
  readonly type = TaskActionTypes.AddSubTask;

  constructor(public payload: { task: Task, parentId: string }) {
  }
}

export class MoveToArchive implements Action {
  readonly type = TaskActionTypes.MoveToArchive;

  constructor(public payload: { tasks: TaskWithSubTasks[] }) {
  }
}

export class MoveToOtherProject implements Action {
  readonly type = TaskActionTypes.MoveToOtherProject;

  constructor(public payload: { task: TaskWithSubTasks; targetProjectId: string; }) {
  }
}

export class ToggleStart implements Action {
  readonly type = TaskActionTypes.ToggleStart;
}

export class RoundTimeSpentForDay implements Action {
  readonly type = TaskActionTypes.RoundTimeSpentForDay;

  constructor(public payload: { day: string, roundTo: RoundTimeOption, isRoundUp: boolean }) {
  }
}

export type TaskActions
  = LoadTaskState
  | SetCurrentTask
  | SetSelectedTask
  | UnsetCurrentTask
  | AddTask
  | UpdateTaskUi
  | ToggleTaskShowSubTasks
  | UpdateTask
  | UpdateTasks
  | UpdateTaskTags
  | DeleteTask
  | UndoDeleteTask
  | MoveSubTask
  | MoveSubTaskUp
  | MoveSubTaskDown
  | AddTimeSpent
  | RemoveTimeSpent
  | AddTaskReminder
  | UpdateTaskReminder
  | RemoveTaskReminder
  | RestoreTask
  | AddSubTask
  | ToggleStart
  | RoundTimeSpentForDay
  | MoveToOtherProject
  | MoveToArchive;

