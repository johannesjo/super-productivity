import { createActionGroup, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { IssueDataReduced } from '../../features/issue/issue.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { Project } from '../../features/project/project.model';
import { BatchOperation } from '@super-productivity/plugin-api';

/**
 * Shared actions that affect multiple reducers (tasks, projects, tags)
 * These actions are handled by the task-shared meta-reducer
 */
export const TaskSharedActions = createActionGroup({
  source: 'Task Shared',
  events: {
    // Task Management
    addTask: props<{
      task: Task;
      issue?: IssueDataReduced;
      workContextId: string;
      workContextType: WorkContextType;
      isAddToBacklog: boolean;
      isAddToBottom: boolean;
      isIgnoreShortSyntax?: boolean;
    }>(),

    convertToMainTask: props<{
      task: Task;
      parentTagIds: string[];
      isPlanForToday?: boolean;
    }>(),

    deleteTask: props<{
      task: TaskWithSubTasks;
    }>(),

    deleteTasks: props<{
      taskIds: string[];
    }>(),

    // TODO rename to `moveTaskToArchive__` to indicate it should not be called directly
    moveToArchive: props<{
      tasks: TaskWithSubTasks[];
    }>(),

    restoreTask: props<{
      task: Task | TaskWithSubTasks;
      subTasks: Task[];
    }>(),

    // Task Scheduling
    scheduleTaskWithTime: props<{
      task: Task;
      dueWithTime: number;
      remindAt?: number;
      isMoveToBacklog: boolean;
      isSkipAutoRemoveFromToday?: boolean;
    }>(),

    reScheduleTaskWithTime: props<{
      task: Task;
      dueWithTime: number;
      remindAt?: number;
      isMoveToBacklog: boolean;
      isSkipAutoRemoveFromToday?: boolean;
    }>(),

    unscheduleTask: props<{
      id: string;
      reminderId?: string;
      isSkipToast?: boolean;
      isLeaveInToday?: boolean;
    }>(),

    dismissReminderOnly: props<{
      id: string;
      reminderId: string;
    }>(),

    // Task Updates
    updateTask: props<{
      task: Update<Task>;
      isIgnoreShortSyntax?: boolean;
    }>(),

    // Project Management
    moveToOtherProject: props<{
      task: TaskWithSubTasks;
      targetProjectId: string;
    }>(),

    deleteProject: props<{
      project: Project;
      allTaskIds: string[];
    }>(),

    // Today Tag Management
    planTasksForToday: props<{
      taskIds: string[];
      parentTaskMap?: { [taskId: string]: string | undefined };
      isShowSnack?: boolean;
      isSkipRemoveReminder?: boolean;
    }>(),

    removeTasksFromTodayTag: props<{
      taskIds: string[];
    }>(),

    // Tag Management
    removeTagsForAllTasks: props<{
      tagIdsToRemove: string[];
    }>(),

    moveTaskInTodayTagList: props<{
      toTaskId: string;
      fromTaskId: string;
    }>(),

    // Batch Operations
    batchUpdateForProject: props<{
      projectId: string;
      operations: BatchOperation[];
      createdTaskIds: { [tempId: string]: string };
    }>(),
  },
});
