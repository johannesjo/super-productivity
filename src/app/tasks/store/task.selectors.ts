import { taskAdapter } from './task.reducer';
import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME } from '../task.const';

export const selectTaskFeatureState = createFeatureSelector<any>(TASK_FEATURE_NAME);

// export const selectTasks = createSelector(selectTaskModuleState, state => state.tasks);
//
// export const selectTaskSharedState = createSelector(selectTaskModuleState, state => state.taskSharedState);
//
// export const selectCurrentTask = createSelector(selectTaskSharedState, state => state.currentTaskId);

// get the selectors
const {selectIds, selectEntities, selectAll, selectTotal} = taskAdapter.getSelectors();

console.log(selectAll);

// select the array of user ids
export const selectTaskIds = selectIds;

// select the dictionary of user entities
export const selectTaskEntities = selectEntities;

// select the array of users
export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);

// select the total user count
export const selectTaskTotal = selectTotal;

export const selectCurrentTask = createSelector(selectTaskFeatureState, state => state.currentTaskId);
