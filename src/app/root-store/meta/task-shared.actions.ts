import { createActionGroup } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { IssueDataReduced } from '../../features/issue/issue.model';
import { WorkContextType } from '../../features/work-context/work-context.model';
import { Project } from '../../features/project/project.model';
import { BatchOperation } from '@super-productivity/plugin-api';
import { PersistentActionMeta } from '../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../core/persistence/operation-log/operation.types';
import { Tag } from '../../features/tag/tag.model';

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

    convertToMainTask: (taskProps: {
      task: Task;
      parentTagIds: string[];
      isPlanForToday?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

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
    moveToArchive: (taskProps: { tasks: TaskWithSubTasks[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: taskProps.tasks.map((t) => t.id),
        opType: OpType.Update,
        isBulk: true,
      } as PersistentActionMeta,
    }),

    restoreTask: (taskProps: { task: Task | TaskWithSubTasks; subTasks: Task[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    // Task Scheduling
    scheduleTaskWithTime: (taskProps: {
      task: Task;
      dueWithTime: number;
      remindAt?: number;
      isMoveToBacklog: boolean;
      isSkipAutoRemoveFromToday?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    reScheduleTaskWithTime: (taskProps: {
      task: Task;
      dueWithTime: number;
      remindAt?: number;
      isMoveToBacklog: boolean;
      isSkipAutoRemoveFromToday?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    unscheduleTask: (taskProps: {
      id: string;
      reminderId?: string;
      isSkipToast?: boolean;
      isLeaveInToday?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    dismissReminderOnly: (taskProps: { id: string; reminderId: string }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

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
    moveToOtherProject: (taskProps: {
      task: TaskWithSubTasks;
      targetProjectId: string;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityId: taskProps.task.id,
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    deleteProject: (taskProps: { project: Project; allTaskIds: string[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'PROJECT',
        entityId: taskProps.project.id,
        opType: OpType.Delete,
      } as PersistentActionMeta,
    }),

    // Today Tag Management
    planTasksForToday: (taskProps: {
      taskIds: string[];
      parentTaskMap?: { [taskId: string]: string | undefined };
      isShowSnack?: boolean;
      isSkipRemoveReminder?: boolean;
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: taskProps.taskIds,
        opType: OpType.Update,
        isBulk: true,
      } as PersistentActionMeta,
    }),

    removeTasksFromTodayTag: (taskProps: { taskIds: string[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: taskProps.taskIds,
        opType: OpType.Update,
        isBulk: true,
      } as PersistentActionMeta,
    }),

    // Tag Management
    addTagToTask: (props: { tag: Tag; taskId: string }) => ({
      ...props,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: [props.taskId, props.tag.id],
        opType: OpType.Update,
      } as PersistentActionMeta,
    }),

    removeTagsForAllTasks: (taskProps: { tagIdsToRemove: string[] }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TAG',
        entityIds: taskProps.tagIdsToRemove,
        opType: OpType.Update,
        isBulk: true,
      } as PersistentActionMeta,
    }),

    moveTaskInTodayTagList: (taskProps: { toTaskId: string; fromTaskId: string }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'TASK',
        entityIds: [taskProps.toTaskId, taskProps.fromTaskId],
        opType: OpType.Move,
        isBulk: true,
      } as PersistentActionMeta,
    }),

    // Batch Operations
    batchUpdateForProject: (taskProps: {
      projectId: string;
      operations: BatchOperation[];
      createdTaskIds: { [tempId: string]: string };
    }) => ({
      ...taskProps,
      meta: {
        isPersistent: true,
        entityType: 'PROJECT',
        entityId: taskProps.projectId,
        opType: OpType.Batch,
      } as PersistentActionMeta,
    }),
  },
});
