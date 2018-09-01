import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME } from '../task.const';
import { TasksState } from './task.reducer';
import { TaskFeatureState } from './task.reducer';

export const selectTasksState = createFeatureSelector<TaskFeatureState>(TASK_FEATURE_NAME);
export const selectTasks = createSelector(selectTasksState, (taskState) => taskState.tasks);
export const selectCurrentTask = (state) => state.CurrentTaskReducer;
