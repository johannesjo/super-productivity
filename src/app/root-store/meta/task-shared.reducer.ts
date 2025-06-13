import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { RootState } from '../root-state';
import { TaskSharedActions } from './task-shared.actions';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME, tagAdapter } from '../../features/tag/store/tag.reducer';
import { TASK_FEATURE_NAME, taskAdapter } from '../../features/tasks/store/task.reducer';
import {
  deleteTaskHelper,
  updateDoneOnForTask,
  updateTimeEstimateForTask,
  updateTimeSpentForTask,
} from '../../features/tasks/store/task.reducer.util';
import { Tag } from '../../features/tag/tag.model';
import { Project } from '../../features/project/project.model';
import { DEFAULT_TASK, Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { calcTotalTimeSpent } from '../../features/tasks/util/calc-total-time-spent';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { getWorklogStr } from '../../util/get-work-log-str';
import { unique } from '../../util/unique';
import { isToday } from '../../util/is-today.util';

// =============================================================================
// TYPES & UTILITIES
// =============================================================================

type ProjectTaskList = 'backlogTaskIds' | 'taskIds';
type TaskEntity = { id: string; projectId?: string | null; tagIds?: string[] };
type TaskWithTags = Task & {
  tagIds: string[];
};

// =============================================================================
// MAIN ACTION HANDLERS
// =============================================================================

/**
 * Meta-reducer that handles cross-cutting concerns for task, project, and tag state updates
 */
export const taskSharedMetaReducer: MetaReducer = (
  reducer: ActionReducer<any, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) {
      return reducer(state, action);
    }

    // Type guard to ensure we have a RootState-like object
    const rootState = state as RootState;
    const actionHandlers: Record<string, (state: RootState) => RootState> = {
      [TaskSharedActions.addTask.type]: () => {
        const { task, isAddToBottom, isAddToBacklog } = action as ReturnType<
          typeof TaskSharedActions.addTask
        >;
        return handleAddTask(rootState, task, isAddToBottom, isAddToBacklog);
      },
      [TaskSharedActions.convertToMainTask.type]: () => {
        const { task, parentTagIds, isPlanForToday } = action as ReturnType<
          typeof TaskSharedActions.convertToMainTask
        >;
        return handleConvertToMainTask(rootState, task, parentTagIds, isPlanForToday);
      },
      [TaskSharedActions.deleteTask.type]: () => {
        const { task } = action as ReturnType<typeof TaskSharedActions.deleteTask>;
        return handleDeleteTask(rootState, task);
      },
      [TaskSharedActions.deleteTasks.type]: () => {
        const { taskIds } = action as ReturnType<typeof TaskSharedActions.deleteTasks>;
        return handleDeleteTasks(rootState, taskIds);
      },
      [TaskSharedActions.moveToArchive.type]: () => {
        const { tasks } = action as ReturnType<typeof TaskSharedActions.moveToArchive>;
        return handleMoveToArchive(rootState, tasks);
      },
      [TaskSharedActions.restoreTask.type]: () => {
        const { task, subTasks } = action as ReturnType<
          typeof TaskSharedActions.restoreTask
        >;
        return handleRestoreTask(rootState, task, subTasks);
      },
      [TaskSharedActions.scheduleTaskWithTime.type]: () => {
        const { task, dueWithTime } = action as ReturnType<
          typeof TaskSharedActions.scheduleTaskWithTime
        >;
        return handleScheduleTaskWithTime(rootState, task, dueWithTime);
      },
      [TaskSharedActions.unscheduleTask.type]: () => {
        const { id } = action as ReturnType<typeof TaskSharedActions.unscheduleTask>;
        return handleUnScheduleTask(rootState, id);
      },
      [TaskSharedActions.updateTask.type]: () => {
        const { task, isIgnoreShortSyntax } = action as ReturnType<
          typeof TaskSharedActions.updateTask
        >;
        return handleUpdateTask(rootState, task, isIgnoreShortSyntax);
      },
      [TaskSharedActions.moveToOtherProject.type]: () => {
        const { task, targetProjectId } = action as ReturnType<
          typeof TaskSharedActions.moveToOtherProject
        >;
        return handleMoveToOtherProject(rootState, task, targetProjectId);
      },
      [TaskSharedActions.deleteProject.type]: () => {
        const { allTaskIds } = action as ReturnType<
          typeof TaskSharedActions.deleteProject
        >;
        return handleDeleteProject(rootState, allTaskIds);
      },
      [TaskSharedActions.planTasksForToday.type]: () => {
        const { taskIds, parentTaskMap = {} } = action as ReturnType<
          typeof TaskSharedActions.planTasksForToday
        >;
        return handlePlanTasksForToday(rootState, taskIds, parentTaskMap);
      },
      [TaskSharedActions.removeTasksFromTodayTag.type]: () => {
        const { taskIds } = action as ReturnType<
          typeof TaskSharedActions.removeTasksFromTodayTag
        >;
        return handleRemoveTasksFromTodayTag(rootState, taskIds);
      },
      [TaskSharedActions.removeTagsForAllTasks.type]: () => {
        const { tagIdsToRemove } = action as ReturnType<
          typeof TaskSharedActions.removeTagsForAllTasks
        >;
        return handleRemoveTagsForAllTasks(rootState, tagIdsToRemove);
      },
    };

    const handler = actionHandlers[action.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, action);
  };
};

// =============================================================================
// ACTION HANDLERS
// =============================================================================

const handleAddTask = (
  state: RootState,
  task: TaskWithTags,
  isAddToBottom: boolean,
  isAddToBacklog: boolean,
): RootState => {
  let updatedState = state;

  // Add task to task state
  const newTask: Task = {
    ...DEFAULT_TASK,
    ...task,
    timeSpent: calcTotalTimeSpent(task.timeSpentOnDay || {}),
    projectId: task.projectId || '',
  };
  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: taskAdapter.addOne(newTask, updatedState[TASK_FEATURE_NAME]),
  };

  // Update project if task has projectId
  if (task.projectId && state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    const project = getProject(state, task.projectId);
    const targetList: ProjectTaskList =
      isAddToBacklog && project.isEnableBacklog ? 'backlogTaskIds' : 'taskIds';

    updatedState = updateProject(updatedState, task.projectId, {
      [targetList]: addTaskToList(project[targetList], task.id, isAddToBottom),
    });
  }

  // Update tags - only update tags that exist
  const tagIdsToUpdate = [
    ...task.tagIds,
    ...(task.dueDay === getWorklogStr() ? [TODAY_TAG.id] : []),
  ].filter((tagId) => state[TAG_FEATURE_NAME].entities[tagId]);

  const tagUpdates = tagIdsToUpdate.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: addTaskToList(getTag(state, tagId).taskIds, task.id, isAddToBottom),
      },
    }),
  );

  return updateTags(updatedState, tagUpdates);
};

const handleConvertToMainTask = (
  state: RootState,
  task: TaskEntity,
  parentTagIds: string[],
  isPlanForToday?: boolean,
): RootState => {
  let updatedState = state;

  // Update project if task has projectId
  if (task.projectId && state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    const project = getProject(state, task.projectId);
    updatedState = updateProject(updatedState, task.projectId, {
      taskIds: [task.id, ...project.taskIds],
    });
  }

  // Update tags - only update tags that exist
  const tagIdsToUpdate = [
    ...parentTagIds,
    ...(isPlanForToday ? [TODAY_TAG.id] : []),
  ].filter((tagId) => state[TAG_FEATURE_NAME].entities[tagId]);
  const tagUpdates = tagIdsToUpdate.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: [task.id, ...getTag(state, tagId).taskIds],
      },
    }),
  );

  return updateTags(updatedState, tagUpdates);
};

const handleDeleteTask = (
  state: RootState,
  task: {
    id: string;
    projectId?: string | null;
    tagIds: string[];
    subTasks?: Task[];
    subTaskIds?: string[];
  },
): RootState => {
  let updatedState = state;

  // Delete task from task state using helper
  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: deleteTaskHelper(
      updatedState[TASK_FEATURE_NAME],
      task as TaskWithSubTasks,
    ),
  };

  // Update project if task has projectId
  if (task.projectId && state[PROJECT_FEATURE_NAME].entities[task.projectId]) {
    const project = getProject(state, task.projectId);
    updatedState = updateProject(updatedState, task.projectId, {
      taskIds: removeTasksFromList(project.taskIds, [task.id]),
      backlogTaskIds: removeTasksFromList(project.backlogTaskIds, [task.id]),
    });
  }

  // Update tags - collect all affected tags and tasks to remove
  // Only include tags that actually exist in the state to prevent errors
  const potentialTagIds = [
    TODAY_TAG.id, // always check today list
    ...task.tagIds,
    ...(task.subTasks || []).flatMap((st) => st.tagIds || []),
  ];

  const affectedTagIds = unique(
    potentialTagIds.filter((tagId) => state[TAG_FEATURE_NAME].entities[tagId]),
  );

  const taskIdsToRemove = [task.id, ...(task.subTaskIds || [])];

  const tagUpdates = affectedTagIds.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: removeTasksFromList(getTag(state, tagId).taskIds, taskIdsToRemove),
      },
    }),
  );

  return updateTags(updatedState, tagUpdates);
};

const handleDeleteTasks = (state: RootState, taskIds: string[]): RootState => {
  let updatedState = state;

  // Get all task IDs including subtasks
  const allIds = taskIds.reduce((acc: string[], id: string) => {
    const task = state[TASK_FEATURE_NAME].entities[id] as Task;
    return task ? [...acc, id, ...task.subTaskIds] : [...acc, id];
  }, []);

  // Remove tasks from task state
  const newTaskState = taskAdapter.removeMany(allIds, updatedState[TASK_FEATURE_NAME]);
  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: {
      ...newTaskState,
      currentTaskId:
        newTaskState.currentTaskId && taskIds.includes(newTaskState.currentTaskId)
          ? null
          : newTaskState.currentTaskId,
    },
  };

  // Only update tags that actually contain at least one of the tasks being deleted
  const affectedTags = (state[TAG_FEATURE_NAME].ids as string[]).filter((tagId) => {
    const tag = state[TAG_FEATURE_NAME].entities[tagId];
    if (!tag) return false;
    return taskIds.some((taskId) => tag.taskIds.includes(taskId));
  });

  const tagUpdates = affectedTags.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: removeTasksFromList(getTag(state, tagId).taskIds, taskIds),
      },
    }),
  );

  return updateTags(updatedState, tagUpdates);
};

const handleMoveToArchive = (state: RootState, tasks: TaskWithSubTasks[]): RootState => {
  const taskIdsToArchive = tasks.flatMap((t) => [t.id, ...t.subTasks.map((st) => st.id)]);

  // Update projects
  const projectIds = unique(
    tasks.map((t) => t.projectId).filter((pid): pid is string => !!pid),
  );

  let updatedState = state;

  if (projectIds.length > 0) {
    const projectUpdates = projectIds.map((pid): Update<Project> => {
      const project = getProject(state, pid);
      return {
        id: pid,
        changes: {
          taskIds: removeTasksFromList(project.taskIds, taskIdsToArchive),
          backlogTaskIds: removeTasksFromList(project.backlogTaskIds, taskIdsToArchive),
        },
      };
    });

    updatedState = {
      ...updatedState,
      [PROJECT_FEATURE_NAME]: projectAdapter.updateMany(
        projectUpdates,
        updatedState[PROJECT_FEATURE_NAME],
      ),
    };
  }

  // Update tags
  const affectedTagIds = unique([
    TODAY_TAG.id, // always cleanup today tag
    ...tasks.flatMap((t) => [...t.tagIds, ...t.subTasks.flatMap((st) => st.tagIds)]),
  ]);

  const tagUpdates = affectedTagIds.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: removeTasksFromList(getTag(state, tagId).taskIds, taskIdsToArchive),
      },
    }),
  );

  return updateTags(updatedState, tagUpdates);
};

const handleRestoreTask = (
  state: RootState,
  task: TaskEntity,
  subTasks: Task[],
): RootState => {
  let updatedState = state;

  // Update project if task has projectId
  if (task.projectId) {
    const project = getProject(state, task.projectId);
    updatedState = updateProject(updatedState, task.projectId, {
      taskIds: unique([...project.taskIds, task.id]),
    });
  }

  // Update tags - group tasks by tagId
  const allTasks = [task, ...subTasks];
  const tagTaskMap = allTasks.reduce(
    (map, t) => {
      (t.tagIds || []).forEach((tagId) => {
        if (!map[tagId]) map[tagId] = [];
        map[tagId].push(t.id);
      });
      return map;
    },
    {} as Record<string, string[]>,
  );

  const tagUpdates = Object.entries(tagTaskMap)
    .filter(([tagId]) => state[TAG_FEATURE_NAME].entities[tagId]) // Only update existing tags
    .map(
      ([tagId, taskIds]): Update<Tag> => ({
        id: tagId,
        changes: {
          taskIds: unique([...getTag(state, tagId).taskIds, ...taskIds]),
        },
      }),
    );

  return updateTags(updatedState, tagUpdates);
};

const handleScheduleTaskWithTime = (
  state: RootState,
  task: { id: string },
  dueWithTime: number,
): RootState => {
  const todayTag = getTag(state, TODAY_TAG.id);
  const isScheduledForToday = isToday(dueWithTime);
  const isCurrentlyInToday = todayTag.taskIds.includes(task.id);

  // No change needed
  if (isScheduledForToday === isCurrentlyInToday) {
    return state;
  }

  const newTaskIds = isScheduledForToday
    ? unique([task.id, ...todayTag.taskIds]) // Add to top, prevent duplicates
    : todayTag.taskIds.filter((id) => id !== task.id); // Remove

  return updateTags(state, [
    {
      id: TODAY_TAG.id,
      changes: { taskIds: newTaskIds },
    },
  ]);
};

const handleUnScheduleTask = (state: RootState, taskId: string): RootState => {
  const todayTag = getTag(state, TODAY_TAG.id);

  if (!todayTag.taskIds.includes(taskId)) {
    return state;
  }

  return updateTags(state, [
    {
      id: TODAY_TAG.id,
      changes: {
        taskIds: todayTag.taskIds.filter((id) => id !== taskId),
      },
    },
  ]);
};

const handleUpdateTask = (
  state: RootState,
  taskUpdate: Update<Task>,
  isIgnoreShortSyntax?: boolean,
): RootState => {
  const taskId = taskUpdate.id as string;
  const currentTask = state[TASK_FEATURE_NAME].entities[taskId] as Task;

  if (!currentTask) {
    return state;
  }

  let updatedState = state;

  // Handle tag changes if tagIds are being updated
  if (taskUpdate.changes.tagIds) {
    const oldTagIds = currentTask.tagIds;
    const newTagIds = taskUpdate.changes.tagIds;

    updatedState = handleTagUpdates(updatedState, taskId, oldTagIds, newTagIds);
  }

  // Handle task state updates using existing task reducer logic
  let taskState = updatedState[TASK_FEATURE_NAME];
  const { timeSpentOnDay, timeEstimate } = taskUpdate.changes;

  taskState = timeSpentOnDay
    ? updateTimeSpentForTask(taskId, timeSpentOnDay, taskState)
    : taskState;
  taskState = updateTimeEstimateForTask(taskUpdate, timeEstimate, taskState);
  taskState = updateDoneOnForTask(taskUpdate, taskState);
  taskState = taskAdapter.updateOne(taskUpdate, taskState);

  return {
    ...updatedState,
    [TASK_FEATURE_NAME]: taskState,
  };
};

const handleTagUpdates = (
  state: RootState,
  taskId: string,
  oldTagIds: string[],
  newTagIds: string[],
): RootState => {
  const tagsToRemoveFrom = oldTagIds
    .filter((oldId) => !newTagIds.includes(oldId))
    .filter((tagId) => state[TAG_FEATURE_NAME].entities[tagId]); // Only existing tags
  const tagsToAddTo = newTagIds
    .filter((newId) => !oldTagIds.includes(newId))
    .filter((tagId) => state[TAG_FEATURE_NAME].entities[tagId]); // Only existing tags

  const removeUpdates = tagsToRemoveFrom.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: getTag(state, tagId).taskIds.filter((id) => id !== taskId),
      },
    }),
  );

  const addUpdates = tagsToAddTo.map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: unique([taskId, ...getTag(state, tagId).taskIds]),
      },
    }),
  );

  return updateTags(state, [...removeUpdates, ...addUpdates]);
};

const handleMoveToOtherProject = (
  state: RootState,
  task: TaskWithSubTasks,
  targetProjectId: string,
): RootState => {
  const currentProjectId = task.projectId;
  const allTaskIds = [task.id, ...task.subTaskIds];

  let updatedState = state;

  // Remove tasks from current project if it exists
  if (currentProjectId && state[PROJECT_FEATURE_NAME].entities[currentProjectId]) {
    const currentProject = getProject(state, currentProjectId);
    updatedState = updateProject(updatedState, currentProjectId, {
      taskIds: removeTasksFromList(currentProject.taskIds, allTaskIds),
      backlogTaskIds: removeTasksFromList(currentProject.backlogTaskIds, allTaskIds),
    });
  }

  // Add tasks to target project
  if (state[PROJECT_FEATURE_NAME].entities[targetProjectId]) {
    const targetProject = getProject(updatedState, targetProjectId);
    // Add all tasks to the regular task list (not backlog) when moving projects
    // This ensures tasks are visible in the new project
    updatedState = updateProject(updatedState, targetProjectId, {
      taskIds: unique([...targetProject.taskIds, ...allTaskIds]),
    });
  }

  // Update all tasks with new projectId
  const taskUpdates: Update<Task>[] = allTaskIds.map((id) => ({
    id,
    changes: {
      projectId: targetProjectId,
    },
  }));

  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: taskAdapter.updateMany(
      taskUpdates,
      updatedState[TASK_FEATURE_NAME],
    ),
  };

  return updatedState;
};

const handleDeleteProject = (state: RootState, allTaskIds: string[]): RootState => {
  const tagUpdates = (state[TAG_FEATURE_NAME].ids as string[]).map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: removeTasksFromList(getTag(state, tagId).taskIds, allTaskIds),
      },
    }),
  );

  return updateTags(state, tagUpdates);
};

const handlePlanTasksForToday = (
  state: RootState,
  taskIds: string[],
  parentTaskMap: Record<string, string | undefined>,
): RootState => {
  const todayTag = getTag(state, TODAY_TAG.id);

  // Filter out tasks that are already in today or whose parent is in today
  const newTasksForToday = taskIds.filter((taskId) => {
    if (todayTag.taskIds.includes(taskId)) return false;
    const parentId = parentTaskMap[taskId];
    return !parentId || !todayTag.taskIds.includes(parentId);
  });

  return updateTags(state, [
    {
      id: TODAY_TAG.id,
      changes: {
        taskIds: unique([...newTasksForToday, ...todayTag.taskIds]),
      },
    },
  ]);
};

const handleRemoveTasksFromTodayTag = (
  state: RootState,
  taskIds: string[],
): RootState => {
  const todayTag = getTag(state, TODAY_TAG.id);

  return updateTags(state, [
    {
      id: TODAY_TAG.id,
      changes: {
        taskIds: removeTasksFromList(todayTag.taskIds, taskIds),
      },
    },
  ]);
};

const handleRemoveTagsForAllTasks = (
  state: RootState,
  tagIdsToRemove: string[],
): RootState => {
  const taskState = state[TASK_FEATURE_NAME];

  // Update all tasks to remove the specified tags
  const taskUpdates: Update<Task>[] = [];
  Object.values(taskState.entities).forEach((task) => {
    if (task && task.tagIds && task.tagIds.some((id) => tagIdsToRemove.includes(id))) {
      taskUpdates.push({
        id: task.id,
        changes: {
          tagIds: task.tagIds.filter((id) => !tagIdsToRemove.includes(id)),
        },
      });
    }
  });

  return {
    ...state,
    [TASK_FEATURE_NAME]: taskAdapter.updateMany(taskUpdates, taskState),
  };
};

/**
 * Helper to update project state with adapter
 */
const updateProject = (
  state: RootState,
  projectId: string,
  changes: Partial<Project>,
): RootState => ({
  ...state,
  [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
    { id: projectId, changes },
    state[PROJECT_FEATURE_NAME],
  ),
});

/**
 * Helper to update tags state with adapter
 */
const updateTags = (state: RootState, updates: Update<Tag>[]): RootState => ({
  ...state,
  [TAG_FEATURE_NAME]: tagAdapter.updateMany(updates, state[TAG_FEATURE_NAME]),
});

/**
 * Helper to get tag entity safely
 */
const getTag = (state: RootState, tagId: string): Tag =>
  state[TAG_FEATURE_NAME].entities[tagId] as Tag;

/**
 * Helper to get project entity safely
 */
const getProject = (state: RootState, projectId: string): Project =>
  state[PROJECT_FEATURE_NAME].entities[projectId] as Project;

/**
 * Helper to add task to list (top or bottom)
 */
const addTaskToList = (
  taskIds: string[],
  taskId: string,
  isAddToBottom: boolean,
): string[] => (isAddToBottom ? [...taskIds, taskId] : [taskId, ...taskIds]);

/**
 * Helper to remove tasks from list
 */
const removeTasksFromList = (taskIds: string[], toRemove: string[]): string[] =>
  taskIds.filter((id) => !toRemove.includes(id));
