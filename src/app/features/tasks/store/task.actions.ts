import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskAdditionalInfoTargetPanel, TaskWithSubTasks } from '../task.model';
import { IssueDataReduced } from '../../issue/issue.model';
import { RoundTimeOption } from '../../project/project.model';
import { WorkContextType } from '../../work-context/work-context.model';

export enum TaskActionTypes {
  'SetCurrentTask' = '[Task] SetCurrentTask',
  'SetSelectedTask' = '[Task] SetSelectedTask',
  'UnsetCurrentTask' = '[Task] UnsetCurrentTask',

  // Task Actions
  'AddTask' = '[Task][Issue] Add Task',
  'UpdateTaskUi' = '[Task] Update Task Ui',
  'UpdateTaskTags' = '[Task] Update Task Tags',
  'RemoveTagsForAllTasks' = '[Task] Remove Tags from all Tasks',
  'ToggleTaskShowSubTasks' = '[Task] Toggle Show Sub Tasks',
  'UpdateTask' = '[Task] Update Task',
  'UpdateTasks' = '[Task] Update Tasks',
  'DeleteTask' = '[Task] Delete Task',
  'DeleteMainTasks' = '[Task] Delete Main Tasks',
  'UndoDeleteTask' = '[Task] Undo Delete Task',
  'MoveSubTask' = '[Task] Move sub task',
  'MoveSubTaskUp' = '[Task] Move up',
  'MoveSubTaskDown' = '[Task] Move down',
  'AddTimeSpent' = '[Task] Add time spent',
  'RemoveTimeSpent' = '[Task] Remove time spent',

  // Reminders & StartAt
  'ScheduleTask' = '[Task] Schedule',
  'UnScheduleTask' = '[Task] UnSchedule',
  'ReScheduleTask' = '[Task] ReSchedule',

  // Sub Task Actions
  'AddSubTask' = '[Task] Add SubTask',
  'ConvertToMainTask' = '[Task] Convert SubTask to main task',

  // Other
  'RestoreTask' = '[Task] Restore Task',
  'MoveToArchive' = '[Task] Move to archive',
  'MoveToOtherProject' = '[Task] Move tasks to other project',
  'ToggleStart' = '[Task] Toggle start',
  'RoundTimeSpentForDay' = '[Task] RoundTimeSpentForDay',
}

export class SetCurrentTask implements Action {
  readonly type: string = TaskActionTypes.SetCurrentTask;

  constructor(public payload: string | null) {}
}

export class SetSelectedTask implements Action {
  readonly type: string = TaskActionTypes.SetSelectedTask;

  constructor(
    public payload: {
      id: string | null;
      taskAdditionalInfoTargetPanel?: TaskAdditionalInfoTargetPanel;
    },
  ) {}
}

export class UnsetCurrentTask implements Action {
  readonly type: string = TaskActionTypes.UnsetCurrentTask;
}

export class AddTask implements Action {
  readonly type: string = TaskActionTypes.AddTask;

  constructor(
    public payload: {
      task: Task;
      issue?: IssueDataReduced;
      workContextId: string;
      workContextType: WorkContextType;
      isAddToBacklog: boolean;
      isAddToBottom: boolean;
    },
  ) {}
}

export class UpdateTask implements Action {
  readonly type: string = TaskActionTypes.UpdateTask;

  constructor(public payload: { task: Update<Task> }) {}
}

export class UpdateTaskUi implements Action {
  readonly type: string = TaskActionTypes.UpdateTaskUi;

  constructor(public payload: { task: Update<Task> }) {}
}

export class UpdateTaskTags implements Action {
  readonly type: string = TaskActionTypes.UpdateTaskTags;

  constructor(public payload: { task: Task; newTagIds: string[]; oldTagIds: string[] }) {}
}

export class RemoveTagsForAllTasks implements Action {
  readonly type: string = TaskActionTypes.RemoveTagsForAllTasks;

  constructor(public payload: { tagIdsToRemove: string[] }) {}
}

export class ToggleTaskShowSubTasks implements Action {
  readonly type: string = TaskActionTypes.ToggleTaskShowSubTasks;

  constructor(
    public payload: { taskId: string; isShowLess: boolean; isEndless: boolean },
  ) {}
}

export class UpdateTasks implements Action {
  readonly type: string = TaskActionTypes.UpdateTasks;

  constructor(public payload: { tasks: Update<Task>[] }) {}
}

export class DeleteTask implements Action {
  readonly type: string = TaskActionTypes.DeleteTask;

  constructor(public payload: { task: TaskWithSubTasks }) {}
}

export class DeleteMainTasks implements Action {
  readonly type: string = TaskActionTypes.DeleteMainTasks;

  constructor(public payload: { taskIds: string[] }) {}
}

export class UndoDeleteTask implements Action {
  readonly type: string = TaskActionTypes.UndoDeleteTask;
}

export class MoveSubTask implements Action {
  readonly type: string = TaskActionTypes.MoveSubTask;

  constructor(
    public payload: {
      taskId: string;
      srcTaskId: string;
      targetTaskId: string;
      newOrderedIds: string[];
    },
  ) {}
}

export class MoveSubTaskUp implements Action {
  readonly type: string = TaskActionTypes.MoveSubTaskUp;

  constructor(public payload: { id: string; parentId: string }) {}
}

export class MoveSubTaskDown implements Action {
  readonly type: string = TaskActionTypes.MoveSubTaskDown;

  constructor(public payload: { id: string; parentId: string }) {}
}

export class AddTimeSpent implements Action {
  readonly type: string = TaskActionTypes.AddTimeSpent;

  constructor(public payload: { task: Task; date: string; duration: number }) {}
}

export class RemoveTimeSpent implements Action {
  readonly type: string = TaskActionTypes.RemoveTimeSpent;

  constructor(public payload: { id: string; date: string; duration: number }) {}
}

// Reminder Actions
export class ScheduleTask implements Action {
  readonly type: string = TaskActionTypes.ScheduleTask;

  constructor(
    public payload: {
      task: Task;
      plannedAt: number;
      remindAt?: number;
      isMoveToBacklog: boolean;
    },
  ) {}
}

export class ReScheduleTask implements Action {
  readonly type: string = TaskActionTypes.ReScheduleTask;

  constructor(
    public payload: {
      id: string;
      title: string;
      plannedAt: number;
      reminderId?: string;
      remindAt?: number;
    },
  ) {}
}

export class UnScheduleTask implements Action {
  readonly type: string = TaskActionTypes.UnScheduleTask;

  constructor(
    public payload: { id: string; reminderId?: string; isSkipToast?: boolean },
  ) {}
}

export class RestoreTask implements Action {
  readonly type: string = TaskActionTypes.RestoreTask;

  constructor(public payload: { task: Task | TaskWithSubTasks; subTasks: Task[] }) {}
}

export class AddSubTask implements Action {
  readonly type: string = TaskActionTypes.AddSubTask;

  constructor(public payload: { task: Task; parentId: string }) {}
}

export class ConvertToMainTask implements Action {
  readonly type: string = TaskActionTypes.ConvertToMainTask;

  constructor(public payload: { task: Task; parentTagIds: string[] }) {}
}

export class MoveToArchive implements Action {
  readonly type: string = TaskActionTypes.MoveToArchive;

  constructor(public payload: { tasks: TaskWithSubTasks[] }) {}
}

export class MoveToOtherProject implements Action {
  readonly type: string = TaskActionTypes.MoveToOtherProject;

  constructor(public payload: { task: TaskWithSubTasks; targetProjectId: string }) {}
}

export class ToggleStart implements Action {
  readonly type: string = TaskActionTypes.ToggleStart;
}

export class RoundTimeSpentForDay implements Action {
  readonly type: string = TaskActionTypes.RoundTimeSpentForDay;

  constructor(
    public payload: {
      day: string;
      taskIds: string[];
      roundTo: RoundTimeOption;
      isRoundUp: boolean;
      projectId?: string | null;
    },
  ) {}
}

export type TaskActions =
  | SetCurrentTask
  | SetSelectedTask
  | UnsetCurrentTask
  | AddTask
  | UpdateTaskUi
  | ToggleTaskShowSubTasks
  | UpdateTask
  | UpdateTasks
  | UpdateTaskTags
  | RemoveTagsForAllTasks
  | DeleteTask
  | DeleteMainTasks
  | UndoDeleteTask
  | MoveSubTask
  | MoveSubTaskUp
  | MoveSubTaskDown
  | AddTimeSpent
  | RemoveTimeSpent
  | ScheduleTask
  | ReScheduleTask
  | UnScheduleTask
  | RestoreTask
  | AddSubTask
  | ConvertToMainTask
  | ToggleStart
  | RoundTimeSpentForDay
  | MoveToOtherProject
  | MoveToArchive;
