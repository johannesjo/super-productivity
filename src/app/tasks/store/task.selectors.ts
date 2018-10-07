import { taskAdapter } from './task.reducer';
import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME } from '../task.const';

export const selectTaskFeatureState = createFeatureSelector<any>(TASK_FEATURE_NAME);

const {selectIds, selectEntities, selectAll, selectTotal} = taskAdapter.getSelectors();

export const selectTaskIds = createSelector(selectTaskFeatureState, selectIds);
export const selectTaskEntities = createSelector(selectTaskFeatureState, selectEntities);
export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);

// select the total user count
export const selectTaskTotal = createSelector(selectTaskFeatureState, selectTotal);

export const selectCurrentTask = createSelector(selectTaskFeatureState, state => state.currentTaskId);

export const selectMainTasksWithSubTasks = createSelector(
  selectAllTasks,
  tasks => tasks
    .filter((task) => !task.parentId)
    .map((task) => {
      if (task.subTasks && task.subTasks.length > 0) {
        const newTask: any = Object.assign({}, task);
        newTask.subTasks = task.subTasks
          .map((subTaskId) => {
            return tasks.find((task_) => task_.id === subTaskId);
          })
          .filter((subTask) => !!subTask);
        return newTask;
      } else {
        return task;
      }
    })
);
