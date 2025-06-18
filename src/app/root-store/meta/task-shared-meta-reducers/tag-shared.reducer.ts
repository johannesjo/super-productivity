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
    const actionHandlers = createActionHandlers(rootState, action);
    const handler = actionHandlers[action.type];
    const updatedState = handler ? handler(rootState) : rootState;

    return reducer(updatedState, action);
  };
};
