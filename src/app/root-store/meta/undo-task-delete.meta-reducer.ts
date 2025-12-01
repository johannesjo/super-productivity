import { RootState } from '../root-state';
import { Dictionary } from '@ngrx/entity';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { undoDeleteTask } from '../../features/tasks/store/task.actions';
import { TaskSharedActions } from './task-shared.actions';
import {
  PROJECT_FEATURE_NAME,
  projectAdapter,
} from '../../features/project/store/project.reducer';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TAG_FEATURE_NAME, tagAdapter } from '../../features/tag/store/tag.reducer';
import { taskAdapter } from '../../features/tasks/store/task.adapter';
import { Project } from '../../features/project/project.model';
import { Action, ActionReducer } from '@ngrx/store/src/models';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { Log } from '../../core/log';

interface UndoTaskDeleteState {
  // Project context
  projectId?: string;
  taskIdsForProject?: string[];
  taskIdsForProjectBacklog?: string[];

  // Parent-child relationship
  parentTaskId?: string;
  subTaskIds?: string[];

  // Tag associations (tagId -> taskIds)
  tagTaskIdMap: Record<string, string[]>;

  // Deleted tasks data
  deletedTaskEntities: Dictionary<Task>;
}

let undoState: UndoTaskDeleteState | null = null;

export const undoTaskDeleteMetaReducer = (
  reducer: ActionReducer<any, any>,
): ActionReducer<any, any> => {
  return (state: RootState, action: Action) => {
    switch (action.type) {
      case TaskSharedActions.deleteTask.type: {
        const { task } = action as ReturnType<typeof TaskSharedActions.deleteTask>;
        undoState = captureTaskDeleteState(state, task);
        return reducer(state, action);
      }

      case undoDeleteTask.type: {
        if (!undoState) {
          return reducer(state, action);
        }

        const restoredState = restoreDeletedTasks(state, undoState);
        undoState = null; // Clear after use
        return reducer(restoredState, action);
      }

      default:
        return reducer(state, action);
    }
  };
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a dictionary of all tasks to be deleted (main task + subtasks)
 */
const createDeletedTaskEntities = (task: TaskWithSubTasks): Dictionary<Task> => {
  return {
    [task.id]: task,
    ...(task.subTasks?.reduce<Dictionary<Task>>(
      (acc, subTask) => ({ ...acc, [subTask.id]: subTask }),
      {},
    ) || {}),
  };
};

/**
 * Builds a map of tag IDs to their task arrays for all deleted tasks
 */
const buildTagTaskIdMap = (
  state: RootState,
  allDeletedTasks: Task[],
): Record<string, string[]> => {
  const tagState = state[TAG_FEATURE_NAME];
  const tagMap: Record<string, string[]> = {};

  for (const task of allDeletedTasks) {
    const tagIds = [TODAY_TAG.id, ...(task.tagIds || [])];

    for (const tagId of tagIds) {
      const tag = tagState.entities[tagId];
      if (tag?.taskIds.includes(task.id) && !tagMap[tagId]) {
        tagMap[tagId] = tag.taskIds;
      }
    }
  }

  return tagMap;
};

/**
 * Captures project-specific data for a task deletion
 */
const captureProjectData = (
  state: RootState,
  projectId: string | null,
): Pick<
  UndoTaskDeleteState,
  'projectId' | 'taskIdsForProject' | 'taskIdsForProjectBacklog'
> => {
  if (!projectId) {
    return {};
  }

  const project = state[PROJECT_FEATURE_NAME].entities[projectId] as Project | undefined;
  if (!project) {
    return {};
  }

  if (!project.taskIds || !project.backlogTaskIds) {
    Log.err('Invalid project data:', { projectId, project });
    throw new Error('Invalid project data');
  }

  return {
    projectId,
    taskIdsForProject: project.taskIds,
    taskIdsForProjectBacklog: project.backlogTaskIds,
  };
};

/**
 * Captures the complete state needed to undo a task deletion
 */
const captureTaskDeleteState = (
  state: RootState,
  task: TaskWithSubTasks,
): UndoTaskDeleteState => {
  const deletedTaskEntities = createDeletedTaskEntities(task);
  const allDeletedTasks = [task, ...(task.subTasks || [])];
  const tagTaskIdMap = buildTagTaskIdMap(state, allDeletedTasks);

  // Handle subtask deletion
  if (task.parentId) {
    const parentTask = state[TASK_FEATURE_NAME].entities[task.parentId];
    return {
      parentTaskId: task.parentId,
      subTaskIds: parentTask?.subTaskIds || [],
      tagTaskIdMap,
      deletedTaskEntities,
    };
  }

  // Handle main task deletion
  return {
    ...captureProjectData(state, task.projectId),
    tagTaskIdMap,
    deletedTaskEntities,
  };
};

/**
 * Restores deleted tasks to the state
 */
const restoreDeletedTasks = (
  state: RootState,
  savedState: UndoTaskDeleteState,
): RootState => {
  let updatedState = state;

  // 1. Restore task entities
  const tasksToRestore = Object.values(savedState.deletedTaskEntities).filter(
    (task): task is Task => !!task,
  );

  updatedState = {
    ...updatedState,
    [TASK_FEATURE_NAME]: taskAdapter.addMany(
      tasksToRestore,
      updatedState[TASK_FEATURE_NAME],
    ),
  };

  // 2. Restore parent-child relationships
  if (savedState.parentTaskId && savedState.subTaskIds) {
    updatedState = {
      ...updatedState,
      [TASK_FEATURE_NAME]: taskAdapter.updateOne(
        {
          id: savedState.parentTaskId,
          changes: { subTaskIds: savedState.subTaskIds },
        },
        updatedState[TASK_FEATURE_NAME],
      ),
    };
  }

  // 3. Restore tag associations
  const tagUpdates = Object.entries(savedState.tagTaskIdMap).map(([tagId, taskIds]) => ({
    id: tagId,
    changes: { taskIds },
  }));

  if (tagUpdates.length > 0) {
    updatedState = {
      ...updatedState,
      [TAG_FEATURE_NAME]: tagAdapter.updateMany(
        tagUpdates,
        updatedState[TAG_FEATURE_NAME],
      ),
    };
  }

  // 4. Restore project associations
  if (savedState.projectId) {
    const projectChanges: { taskIds?: string[]; backlogTaskIds?: string[] } = {};
    if (savedState.taskIdsForProject) {
      projectChanges.taskIds = savedState.taskIdsForProject;
    }
    if (savedState.taskIdsForProjectBacklog) {
      projectChanges.backlogTaskIds = savedState.taskIdsForProjectBacklog;
    }

    if (Object.keys(projectChanges).length > 0) {
      updatedState = {
        ...updatedState,
        [PROJECT_FEATURE_NAME]: projectAdapter.updateOne(
          {
            id: savedState.projectId,
            changes: projectChanges,
          },
          updatedState[PROJECT_FEATURE_NAME],
        ),
      };
    }
  }

  return updatedState;
};
