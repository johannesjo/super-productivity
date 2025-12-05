import { Action, ActionReducer, MetaReducer } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { RootState } from '../../root-state';
import { TaskSharedActions } from '../task-shared.actions';
import {
  TASK_FEATURE_NAME,
  taskAdapter,
} from '../../../features/tasks/store/task.reducer';
import { Task } from '../../../features/tasks/task.model';
import { Tag } from '../../../features/tag/tag.model';
import { ActionHandlerMap } from './task-shared-helpers';
import { updateTag } from '../../../features/tag/store/tag.actions';
import { OpLog } from '../../../core/log';

// =============================================================================
// ACTION TRANSFORMERS
// =============================================================================

/**
 * Sanitizes a Tag update action by filtering out non-existent task IDs from taskIds.
 * This prevents sync issues where a Tag update operation arrives before the corresponding
 * task has been created on this client.
 *
 * @param state - Current root state
 * @param action - The updateTag action to sanitize
 * @returns The sanitized action (or original if no sanitization needed)
 */
const sanitizeUpdateTagAction = (
  state: RootState,
  action: ReturnType<typeof updateTag>,
): ReturnType<typeof updateTag> => {
  const changes = action.tag.changes;

  // Only sanitize if taskIds are being updated
  if (!changes || !('taskIds' in changes) || !Array.isArray(changes.taskIds)) {
    return action;
  }

  const taskState = state[TASK_FEATURE_NAME];
  const existingTaskIds = new Set(taskState.ids as string[]);

  // Filter to only include tasks that exist in the current state
  const sanitizedTaskIds = changes.taskIds.filter((taskId) =>
    existingTaskIds.has(taskId),
  );

  // If nothing was filtered out, return the original action
  if (sanitizedTaskIds.length === changes.taskIds.length) {
    return action;
  }

  const removedTaskIds = changes.taskIds.filter((taskId) => !existingTaskIds.has(taskId));
  OpLog.warn('tagSharedMetaReducer: Filtered out non-existent taskIds from Tag update', {
    tagId: action.tag.id,
    removedTaskIds,
    originalCount: changes.taskIds.length,
    sanitizedCount: sanitizedTaskIds.length,
  });

  // Create a new action with sanitized taskIds
  return {
    ...action,
    tag: {
      ...action.tag,
      changes: {
        ...changes,
        taskIds: sanitizedTaskIds,
      } as Partial<Tag>,
    },
  };
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
});

export const tagSharedMetaReducer: MetaReducer = (
  reducer: ActionReducer<any, Action>,
) => {
  return (state: unknown, action: Action) => {
    if (!state) return reducer(state, action);

    const rootState = state as RootState;

    // Transform updateTag action to sanitize taskIds before processing
    let transformedAction = action;
    if (action.type === updateTag.type) {
      transformedAction = sanitizeUpdateTagAction(
        rootState,
        action as ReturnType<typeof updateTag>,
      );
    }

    const actionHandlers = createActionHandlers(rootState, transformedAction);
    const handler = actionHandlers[transformedAction.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, transformedAction);
  };
};
