import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { TaskSharedActions } from '../task-shared.actions';
import { PROJECT_FEATURE_NAME } from '../../../features/project/store/project.reducer';
import { TAG_FEATURE_NAME } from '../../../features/tag/store/tag.reducer';
import {
  TASK_FEATURE_NAME,
  taskAdapter,
} from '../../../features/tasks/store/task.reducer';
import { Tag } from '../../../features/tag/tag.model';
import { Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import { unique } from '../../../util/unique';
import {
  ActionHandlerMap,
  getProject,
  getTag,
  removeTasksFromList,
  updateProject,
  updateTags,
} from './task-shared-helpers';

// =============================================================================
// ACTION HANDLERS
// =============================================================================

const handleMoveToOtherProject = (
  state: RootState,
  task: TaskWithSubTasks,
  targetProjectId: string,
): RootState => {
  const taskState = state[TASK_FEATURE_NAME];
  const canonicalTask = taskState.entities[task.id] as Task | undefined;
  const canonicalSubTaskIds = unique([
    ...(canonicalTask?.subTaskIds ?? []),
    ...(task.subTaskIds ?? []),
  ]);
  const currentProjectId = canonicalTask?.projectId ?? task.projectId;
  const allTaskIds = unique([task.id, ...canonicalSubTaskIds]);

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
    // Only add the parent task to the task list, not subtasks
    // Subtasks are displayed through their parent's subTaskIds property
    updatedState = updateProject(updatedState, targetProjectId, {
      taskIds: unique([...targetProject.taskIds, task.id]),
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

const handleDeleteProject = (
  state: RootState,
  project: { id: string },
  allTaskIds: string[],
): RootState => {
  const tagUpdates = (state[TAG_FEATURE_NAME].ids as string[]).map(
    (tagId): Update<Tag> => ({
      id: tagId,
      changes: {
        taskIds: removeTasksFromList(getTag(state, tagId).taskIds, allTaskIds),
      },
    }),
  );

  // First update tags
  const stateWithUpdatedTags = updateTags(state, tagUpdates);

  // Then remove the project entity
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [project.id]: _, ...remainingEntities } =
    stateWithUpdatedTags[PROJECT_FEATURE_NAME].entities;
  const remainingIds = (
    stateWithUpdatedTags[PROJECT_FEATURE_NAME].ids as string[]
  ).filter((id) => id !== project.id);

  return {
    ...stateWithUpdatedTags,
    [PROJECT_FEATURE_NAME]: {
      ...stateWithUpdatedTags[PROJECT_FEATURE_NAME],
      ids: remainingIds,
      entities: remainingEntities,
    },
  };
};

// =============================================================================
// META REDUCER
// =============================================================================

const createActionHandlers = (state: RootState, action: Action): ActionHandlerMap => ({
  [TaskSharedActions.moveToOtherProject.type]: () => {
    const { task, targetProjectId } = action as ReturnType<
      typeof TaskSharedActions.moveToOtherProject
    >;
    return handleMoveToOtherProject(state, task, targetProjectId);
  },
  [TaskSharedActions.deleteProject.type]: () => {
    const { project, allTaskIds } = action as ReturnType<
      typeof TaskSharedActions.deleteProject
    >;
    return handleDeleteProject(state, project, allTaskIds);
  },
});

export const projectSharedMetaReducer: MetaReducer = (
  reducer: ActionReducer<any, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) return reducer(state, action);

    const rootState = state as RootState;
    const actionHandlers = createActionHandlers(rootState, action);
    const handler = actionHandlers[action.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, action);
  };
};
