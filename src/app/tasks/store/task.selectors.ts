import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME } from '../task.const';
import { TaskModuleState } from './task-store';

export const selectTaskModuleState = createFeatureSelector<TaskModuleState>(TASK_FEATURE_NAME);

export const selectTasks = createSelector(selectTaskModuleState, state => state.tasks);

export const selectTaskSharedState = createSelector(selectTaskModuleState, state => state.taskSharedState);

export const selectCurrentTask = createSelector(selectTaskSharedState, state => state.currentTaskId);