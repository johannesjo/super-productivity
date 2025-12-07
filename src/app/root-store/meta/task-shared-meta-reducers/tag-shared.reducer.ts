import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { TaskSharedActions } from '../task-shared.actions';
import {
  TASK_FEATURE_NAME,
  taskAdapter,
} from '../../../features/tasks/store/task.reducer';
import { Task } from '../../../features/tasks/task.model';
import { ActionHandlerMap } from './task-shared-helpers';
import {
  deleteTag,
  deleteTags,
  updateTag,
} from '../../../features/tag/store/tag.actions';
import { OpLog } from '../../../core/log';

// =============================================================================
// ACTION TRANSFORMERS
// =============================================================================

/**
 * Logs a warning if a Tag update contains taskIds that don't exist in the store.
 * This is informational only - we no longer filter out these IDs because:
 * 1. The DependencyResolverService now ensures proper ordering (tasks before tag updates)
 * 2. The UI gracefully handles references to non-existent tasks
 * 3. Filtering would cause data loss if ordering still failed for any reason
 *
 * @param state - Current root state
 * @param action - The updateTag action to check
 */
const warnOnMissingTaskIds = (
  state: RootState,
  action: ReturnType<typeof updateTag>,
): void => {
  const changes = action.tag.changes;

  // Only check if taskIds are being updated
  if (!changes || !('taskIds' in changes) || !Array.isArray(changes.taskIds)) {
    return;
  }

  const taskState = state[TASK_FEATURE_NAME];
  const existingTaskIds = new Set(taskState.ids as string[]);

  const missingTaskIds = changes.taskIds.filter((taskId) => !existingTaskIds.has(taskId));

  if (missingTaskIds.length > 0) {
    OpLog.warn(
      'tagSharedMetaReducer: Tag update references non-existent taskIds (allowing anyway)',
      {
        tagId: action.tag.id,
        missingTaskIds,
        totalTaskIds: changes.taskIds.length,
      },
    );
  }
};

// =============================================================================
// ACTION HANDLERS
// =============================================================================

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

// =============================================================================
// META REDUCER
// =============================================================================

const createActionHandlers = (state: RootState, action: Action): ActionHandlerMap => ({
  [TaskSharedActions.removeTagsForAllTasks.type]: () => {
    const { tagIdsToRemove } = action as ReturnType<
      typeof TaskSharedActions.removeTagsForAllTasks
    >;
    return handleRemoveTagsForAllTasks(state, tagIdsToRemove);
  },
  // Handle deleteTag atomically - remove tag references from tasks BEFORE the tag entity is deleted
  // This ensures atomic consistency: tasks won't have references to non-existent tags
  [deleteTag.type]: () => {
    const { id } = action as ReturnType<typeof deleteTag>;
    return handleRemoveTagsForAllTasks(state, [id]);
  },
  // Handle deleteTags atomically - remove tag references from tasks BEFORE tag entities are deleted
  [deleteTags.type]: () => {
    const { ids } = action as ReturnType<typeof deleteTags>;
    return handleRemoveTagsForAllTasks(state, ids);
  },
});

export const tagSharedMetaReducer: MetaReducer = (
  reducer: ActionReducer<any, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) return reducer(state, action);

    const rootState = state as RootState;

    // Log warning if updateTag references non-existent tasks (informational only)
    if (action.type === updateTag.type) {
      warnOnMissingTaskIds(rootState, action as ReturnType<typeof updateTag>);
    }

    const actionHandlers = createActionHandlers(rootState, action);
    const handler = actionHandlers[action.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, action);
  };
};
