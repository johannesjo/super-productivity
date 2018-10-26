import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME, taskAdapter, TaskState } from './task.reducer';
import { selectIssueEntityMap } from '../../issue/issue.selector';

const mapIssueDataToTask = (tasks_, issueEntityMap) => {
  return tasks_ && tasks_.map((task) => {
    const issueData = (task.issueId && task.issueType) && issueEntityMap[task.issueType][task.issueId];
    return issueData ? {...task, issueData: issueData} : task;
  });
};

const mapSubTasksToTasks = (tasks__) => {
  return tasks__.filter((task) => !task.parentId)
    .map((task) => {
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        return {
          ...task,
          subTasks: task.subTaskIds
            .map((subTaskId) => tasks__.find((task_) => task_.id === subTaskId))
        };
      } else {
        return task;
      }
    });
};

const mapEstimateRemaining = (tasks) => tasks && tasks.length && tasks.reduce((acc, task) => {
  const estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
  const isTrackVal = (estimateRemaining > 0) && !task.isDone;
  return acc + ((isTrackVal) ? estimateRemaining : 0);
}, 0);

const mapTasksFromIds = (tasks__, ids) => {
  return ids.map(id => tasks__.find(task => task.id === id));
};

// SELECTORS
// ---------
const {selectIds, selectEntities, selectAll, selectTotal} = taskAdapter.getSelectors();
export const selectTaskFeatureState = createFeatureSelector<TaskState>(TASK_FEATURE_NAME);
export const selectBacklogTaskIds = createSelector(selectTaskFeatureState, state => state.backlogTaskIds);
export const selectTodaysTaskIds = createSelector(selectTaskFeatureState, state => state.todaysTaskIds);
export const selectCurrentTask = createSelector(selectTaskFeatureState, state => state.currentTaskId);


export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);
export const selectAllTasksWithIssueData = createSelector(selectAllTasks, selectIssueEntityMap, mapIssueDataToTask);

export const selectAllTasksWithSubTasks = createSelector(selectAllTasksWithIssueData, mapSubTasksToTasks);

export const selectTodaysTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectTodaysTaskIds, mapTasksFromIds);

export const selectBacklogTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectBacklogTaskIds, mapTasksFromIds);


export const selectTodaysUnDoneTasksWithSubTasks = createSelector(
  selectTodaysTasksWithSubTasks,
  (tasks) => tasks.filter(task => !task.isDone)
);


export const selectTodaysDoneTasksWithSubTasks = createSelector(
  selectTodaysTasksWithSubTasks,
  (tasks) => tasks.filter(task => task.isDone)
);

export const selectEstimateRemainingForToday = createSelector(selectTodaysTasksWithSubTasks, mapEstimateRemaining);


export const selectEstimateRemainingForBacklog = createSelector(selectBacklogTasksWithSubTasks, mapEstimateRemaining);
