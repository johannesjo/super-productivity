import { createActionGroup, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { IssueDataReduced } from '../../features/issue/issue.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { Project } from '../../features/project/project.model';
import { BatchOperation } from '@super-productivity/plugin-api';
import { PersistentActionMeta } from '../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../core/persistence/operation-log/operation.types';

/**
 * Shared actions that affect multiple reducers (tasks, projects, tags)
 * These actions are handled by the task-shared meta-reducer
 */
export const TaskSharedActions = createActionGroup({
  source: 'Task Shared',
  events: {
    // Task Management
    addTask: (taskProps: {
      task: Task;
      issue?: IssueDataReduced;
      workContextId: string;
      workContextType: WorkContextType;
      isAddToBacklog: boolean;
      isAddToBottom: boolean;
      isIgnoreShortSyntax?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Create,
      } as PersistentActionMeta,
    }),

    convertToMainTask: props<{
      task: Task;
      parentTagIds: string[];
      isPlanForToday?: boolean;
    }>(),

    deleteTask: (taskProps: { task: TaskWithSubTasks }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Delete,
      } as PersistentActionMeta,
    }),

    deleteTasks: (taskProps: { taskIds: string[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: taskProps.taskIds,
        opType: OpType.Delete,
        isBulk: true,
      } as PersistentActionMeta,
    }),

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
    updateTask: (taskProps: { task: Update<Task>; isIgnoreShortSyntax?: boolean }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id as string,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

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
