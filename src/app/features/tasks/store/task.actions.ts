import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskDetailTargetPanel, TaskWithSubTasks } from '../task.model';
import { IssueDataReduced } from '../../issue/issue.model';
import { RoundTimeOption } from '../../project/project.model';
import { WorkContextType } from '../../work-context/work-context.model';

enum TaskActionTypes {
  'SetCurrentTask' = '[Task] SetCurrentTask',
  'SetSelectedTask' = '[Task] SetSelectedTask',
  'UnsetCurrentTask' = '[Task] UnsetCurrentTask',

  // Task Actions
  'AddTask' = '[Task][Issue] Add Task',
  'UpdateTaskUi' = '[Task] Update Task Ui',
  'UpdateTaskTags' = '[Task] Update Task Tags',
  'RemoveTagsForAllTasks' = '[Task] Remove Tags from all Tasks',
  'ToggleTaskHideSubTasks' = '[Task] Toggle Show Sub Tasks',
  'UpdateTask' = '[Task] Update Task',
  'UpdateMTasksSimple' = '[Task] Update multiple Tasks (simple)',
  'UpdateTasks' = '[Task] Update Tasks',
  'DeleteTask' = '[Task] Delete Task',
  'DeleteTasks' = '[Task] Delete Tasks',
  'DeleteMainTasks' = '[Task] Delete Main Tasks',
  'UndoDeleteTask' = '[Task] Undo Delete Task',
  'MoveSubTask' = '[Task] Move sub task',
  'MoveSubTaskUp' = '[Task] Move up',
  'MoveSubTaskDown' = '[Task] Move down',
  'MoveSubTaskToTop' = '[Task] Move to top',
  'MoveSubTaskToBottom' = '[Task] Move to bottom',
  'AddTimeSpent' = '[Task] Add time spent',
  'RemoveTimeSpent' = '[Task] Remove time spent',

  // Reminders & StartAt
  'ScheduleTaskWithTime' = '[Task] Schedule with time',
  'UnScheduleTask' = '[Task] UnSchedule',
  'ReScheduleTask' = '[Task] ReSchedule',
  'AddReminderIdToTask' = '[Task] Add ReminderId to Task',

  'RemoveReminder' = '[Task] Remove Reminder',

  // Sub Task Actions
  'AddSubTask' = '[Task] Add SubTask',
  'ConvertToMainTask' = '[Task] Convert SubTask to main task',

  // Other
  'RestoreTask' = '[Task] Restore Task',
  'MoveToArchive' = '[Task] Move to archive',
  'MoveToOtherProject' = '[Task] Move tasks to other project',
  'ToggleStart' = '[Task] Toggle start',
  'RoundTimeSpentForDay' = '[Task] RoundTimeSpentForDay',
  'AddNewTagsFromShortSyntax' = '[Task] Add new tags from short syntax',
}

export const setCurrentTask = createAction(
  TaskActionTypes.SetCurrentTask,
  props<{
    id: string | null;
  }>(),
);

export const setSelectedTask = createAction(
  TaskActionTypes.SetSelectedTask,
  props<{
    id: string | null;
    taskDetailTargetPanel?: TaskDetailTargetPanel;
    isSkipToggle?: boolean;
  }>(),
);

export const unsetCurrentTask = createAction(TaskActionTypes.UnsetCurrentTask);

export const addTask = createAction(
  TaskActionTypes.AddTask,
  props<{
    task: Task;
    issue?: IssueDataReduced;
    workContextId: string;
    workContextType: WorkContextType;
    isAddToBacklog: boolean;
    isAddToBottom: boolean;
    isIgnoreShortSyntax?: boolean;
  }>(),
);

export const updateTask = createAction(
  TaskActionTypes.UpdateTask,
  props<{
    task: Update<Task>;
    isIgnoreShortSyntax?: boolean;
  }>(),
);

export const addReminderIdToTask = createAction(
  TaskActionTypes.AddReminderIdToTask,
  props<{
    taskId: string;
    reminderId: string;
  }>(),
);

export const __updateMultipleTaskSimple = createAction(
  TaskActionTypes.UpdateMTasksSimple,
  props<{
    taskUpdates: Update<Task>[];
    isIgnoreShortSyntax?: boolean;
  }>(),
);

export const updateTaskUi = createAction(
  TaskActionTypes.UpdateTaskUi,
  props<{ task: Update<Task> }>(),
);

export const updateTaskTags = createAction(
  TaskActionTypes.UpdateTaskTags,
  props<{
    task: Task;
    newTagIds: string[];
    isSkipExcludeCheck?: boolean;
  }>(),
);

export const removeTagsForAllTasks = createAction(
  TaskActionTypes.RemoveTagsForAllTasks,
  props<{ tagIdsToRemove: string[] }>(),
);

export const toggleTaskHideSubTasks = createAction(
  TaskActionTypes.ToggleTaskHideSubTasks,
  props<{ taskId: string; isShowLess: boolean; isEndless: boolean }>(),
);

export const updateTasks = createAction(
  TaskActionTypes.UpdateTasks,
  props<{ tasks: Update<Task>[] }>(),
);

export const deleteTask = createAction(
  TaskActionTypes.DeleteTask,
  props<{ task: TaskWithSubTasks }>(),
);

// NOTE: does not automatically account for sub tasks!!!
export const deleteTasks = createAction(
  TaskActionTypes.DeleteTasks,
  props<{ taskIds: string[] }>(),
);

export const undoDeleteTask = createAction(TaskActionTypes.UndoDeleteTask);

export const moveSubTask = createAction(
  TaskActionTypes.MoveSubTask,
  props<{
    taskId: string;
    srcTaskId: string;
    targetTaskId: string;
    newOrderedIds: string[];
  }>(),
);

export const moveSubTaskUp = createAction(
  TaskActionTypes.MoveSubTaskUp,

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskDown = createAction(
  TaskActionTypes.MoveSubTaskDown,

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskToTop = createAction(
  TaskActionTypes.MoveSubTaskToTop,

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskToBottom = createAction(
  TaskActionTypes.MoveSubTaskToBottom,

  props<{ id: string; parentId: string }>(),
);

export const removeTimeSpent = createAction(
  TaskActionTypes.RemoveTimeSpent,

  props<{ id: string; date: string; duration: number }>(),
);

// Reminder Actions
export const scheduleTaskWithTime = createAction(
  TaskActionTypes.ScheduleTaskWithTime,

  props<{
    task: Task;
    dueWithTime: number;
    remindAt?: number;
    isMoveToBacklog: boolean;
    isSkipAutoRemoveFromToday?: boolean;
  }>(),
);

export const reScheduleTaskWithTime = createAction(
  TaskActionTypes.ReScheduleTask,

  props<{
    task: Task;
    dueWithTime: number;
    isMoveToBacklog: boolean;
    remindAt?: number;
  }>(),
);

export const unScheduleTask = createAction(
  TaskActionTypes.UnScheduleTask,

  props<{ id: string; reminderId?: string; isSkipToast?: boolean }>(),
);

export const removeReminderFromTask = createAction(
  TaskActionTypes.RemoveReminder,

  props<{
    id: string;
    reminderId: string;
    isSkipToast?: boolean;
    isLeaveDueTime?: boolean;
  }>(),
);

export const restoreTask = createAction(
  TaskActionTypes.RestoreTask,

  props<{ task: Task | TaskWithSubTasks; subTasks: Task[] }>(),
);

export const addSubTask = createAction(
  TaskActionTypes.AddSubTask,

  props<{ task: Task; parentId: string }>(),
);

export const convertToMainTask = createAction(
  TaskActionTypes.ConvertToMainTask,

  props<{ task: Task; parentTagIds: string[]; isPlanForToday?: boolean }>(),
);

// the _ indicates that it should not be used directly, but always over the service instead
export const moveToArchive_ = createAction(
  TaskActionTypes.MoveToArchive,

  props<{ tasks: TaskWithSubTasks[] }>(),
);

export const moveToOtherProject = createAction(
  TaskActionTypes.MoveToOtherProject,

  props<{ task: TaskWithSubTasks; targetProjectId: string }>(),
);

export const toggleStart = createAction(TaskActionTypes.ToggleStart);

export const roundTimeSpentForDay = createAction(
  TaskActionTypes.RoundTimeSpentForDay,

  props<{
    day: string;
    taskIds: string[];
    roundTo: RoundTimeOption;
    isRoundUp: boolean;
    projectId?: string | null;
  }>(),
);

export const addNewTagsFromShortSyntax = createAction(
  TaskActionTypes.AddNewTagsFromShortSyntax,

  props<{
    taskId: string;
    newTitles: string[];
  }>(),
);
