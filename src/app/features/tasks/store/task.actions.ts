import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskDetailTargetPanel, TaskWithSubTasks } from '../task.model';
import { RoundTimeOption } from '../../project/project.model';

export const setCurrentTask = createAction(
  '[Task] SetCurrentTask',
  props<{
    id: string | null;
  }>(),
);

export const setSelectedTask = createAction(
  '[Task] SetSelectedTask',
  props<{
    id: string | null;
    taskDetailTargetPanel?: TaskDetailTargetPanel;
    isSkipToggle?: boolean;
  }>(),
);

export const unsetCurrentTask = createAction('[Task] UnsetCurrentTask');

export const addReminderIdToTask = createAction(
  '[Task] Add ReminderId to Task',
  props<{
    taskId: string;
    reminderId: string;
  }>(),
);

export const __updateMultipleTaskSimple = createAction(
  '[Task] Update multiple Tasks (simple)',
  props<{
    taskUpdates: Update<Task>[];
    isIgnoreShortSyntax?: boolean;
  }>(),
);

export const updateTaskUi = createAction(
  '[Task] Update Task Ui',
  props<{ task: Update<Task> }>(),
);

export const removeTagsForAllTasks = createAction(
  '[Task] Remove Tags from all Tasks',
  props<{ tagIdsToRemove: string[] }>(),
);

export const toggleTaskHideSubTasks = createAction(
  '[Task] Toggle Show Sub Tasks',
  props<{ taskId: string; isShowLess: boolean; isEndless: boolean }>(),
);

export const updateTasks = createAction(
  '[Task] Update Tasks',
  props<{ tasks: Update<Task>[] }>(),
);

export const undoDeleteTask = createAction('[Task] Undo Delete Task');

export const moveSubTask = createAction(
  '[Task] Move sub task',
  props<{
    taskId: string;
    srcTaskId: string;
    targetTaskId: string;
    newOrderedIds: string[];
  }>(),
);

export const moveSubTaskUp = createAction(
  '[Task] Move up',

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskDown = createAction(
  '[Task] Move down',

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskToTop = createAction(
  '[Task] Move to top',

  props<{ id: string; parentId: string }>(),
);

export const moveSubTaskToBottom = createAction(
  '[Task] Move to bottom',

  props<{ id: string; parentId: string }>(),
);

export const removeTimeSpent = createAction(
  '[Task] Remove time spent',

  props<{ id: string; date: string; duration: number }>(),
);

// Reminder Actions
export const scheduleTaskWithTime = createAction(
  '[Task] Schedule with time',

  props<{
    task: Task;
    dueWithTime: number;
    remindAt?: number;
    isMoveToBacklog: boolean;
    isSkipAutoRemoveFromToday?: boolean;
  }>(),
);

export const reScheduleTaskWithTime = createAction(
  '[Task] ReSchedule',

  props<{
    task: Task;
    dueWithTime: number;
    isMoveToBacklog: boolean;
    remindAt?: number;
  }>(),
);

export const unScheduleTask = createAction(
  '[Task] UnSchedule',

  props<{ id: string; reminderId?: string; isSkipToast?: boolean }>(),
);

export const removeReminderFromTask = createAction(
  '[Task] Remove Reminder',

  props<{
    id: string;
    reminderId: string;
    isSkipToast?: boolean;
    isLeaveDueTime?: boolean;
  }>(),
);

export const restoreTask = createAction(
  '[Task] Restore Task',

  props<{ task: Task | TaskWithSubTasks; subTasks: Task[] }>(),
);

export const addSubTask = createAction(
  '[Task] Add SubTask',

  props<{ task: Task; parentId: string }>(),
);

export const convertToMainTask = createAction(
  '[Task] Convert SubTask to main task',

  props<{ task: Task; parentTagIds: string[]; isPlanForToday?: boolean }>(),
);

// the _ indicates that it should not be used directly, but always over the service instead
export const moveToArchive_ = createAction(
  '[Task] Move to archive',

  props<{ tasks: TaskWithSubTasks[] }>(),
);

export const moveToOtherProject = createAction(
  '[Task] Move tasks to other project',

  props<{ task: TaskWithSubTasks; targetProjectId: string }>(),
);

export const toggleStart = createAction('[Task] Toggle start');

export const roundTimeSpentForDay = createAction(
  '[Task] RoundTimeSpentForDay',

  props<{
    day: string;
    taskIds: string[];
    roundTo: RoundTimeOption;
    isRoundUp: boolean;
    projectId?: string | null;
  }>(),
);

export const addNewTagsFromShortSyntax = createAction(
  '[Task] Add new tags from short syntax',

  props<{
    taskId: string;
    newTitles: string[];
  }>(),
);
