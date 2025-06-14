import { Action, ActionReducer } from '@ngrx/store';
import { taskSharedCrudMetaReducer } from './task-shared-crud.reducer';
import { taskSharedLifecycleMetaReducer } from './task-shared-lifecycle.reducer';
import { taskSharedSchedulingMetaReducer } from './task-shared-scheduling.reducer';
import { projectSharedMetaReducer } from './project-shared.reducer';
import { tagSharedMetaReducer } from './tag-shared.reducer';
import { plannerSharedMetaReducer } from './planner-shared.reducer';

/**
 * Combines all task-shared meta-reducers for testing purposes.
 * This simulates the behavior of the original monolithic taskSharedMetaReducer.
 */
export const createCombinedTaskSharedMetaReducer = (
  reducer: ActionReducer<any, Action>,
): ActionReducer<any, Action> => {
  // Apply meta-reducers in the same order as in main.ts
  let combinedReducer = reducer;
  combinedReducer = taskSharedCrudMetaReducer(combinedReducer);
  combinedReducer = taskSharedLifecycleMetaReducer(combinedReducer);
  combinedReducer = taskSharedSchedulingMetaReducer(combinedReducer);
  combinedReducer = projectSharedMetaReducer(combinedReducer);
  combinedReducer = tagSharedMetaReducer(combinedReducer);
  combinedReducer = plannerSharedMetaReducer(combinedReducer);
  return combinedReducer;
};
