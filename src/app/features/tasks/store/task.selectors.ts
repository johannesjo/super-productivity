import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TASK_FEATURE_NAME, taskAdapter, TaskState } from './task.reducer';
import { selectIssueEntityMap } from '../../issue/issue.selector';
import { TaskWithSubTasks } from '../task.model';

const mapIssueDataToTask = (tasks_, issueEntityMap) => {
  return tasks_ && tasks_.map((task) => {
    const issueData = (task.issueId && task.issueType) && issueEntityMap[task.issueType] && issueEntityMap[task.issueType][task.issueId];
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
  let isTrackVal;
  let estimateRemaining;
  if (task.subTasks && task.subTasks.length > 0) {
    estimateRemaining = task.subTasks.reduce((subAcc, subTask) => {
      const estimateRemainingSub = (+subTask.timeEstimate) - (+subTask.timeSpent);
      const isTrackValSub = (estimateRemainingSub > 0) && !subTask.isDone;
      return acc + ((isTrackValSub) ? estimateRemainingSub : 0);
    }, 0);
  } else {
    estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
  }
  isTrackVal = (estimateRemaining > 0) && !task.isDone;
  return acc + ((isTrackVal) ? estimateRemaining : 0);
}, 0);

export const getFlatIdList = (arr) => {
  let ids = [];
  arr.forEach(task => {
    ids.push(task.id);
    ids = ids.concat(task.subTaskIds);
  });
  return ids;
};

const mapTasksFromIds = (tasks__, ids) => {
  return ids.map(id => tasks__.find(task => task.id === id));
};

const flattenTasks = (tasks___) => {
  let flatTasks = [];
  tasks___.forEach(task => {
    flatTasks.push(task);
    if (task.subTasks) {
      flatTasks = flatTasks.concat(task.subTasks);
    }
  });
  return flatTasks;
};

const mapTotalTimeWorked = (tasks) => tasks.reduce((acc, task) => acc + task.timeSpent, 0);

// SELECTORS
// ---------
const {selectIds, selectEntities, selectAll, selectTotal} = taskAdapter.getSelectors();
export const selectTaskFeatureState = createFeatureSelector<TaskState>(TASK_FEATURE_NAME);
export const selectTaskEntities = createSelector(selectTaskFeatureState, selectEntities);
export const selectIsTasksLoaded = createSelector(selectTaskFeatureState, state => state.isDataLoaded);
export const selectBacklogTaskIds = createSelector(selectTaskFeatureState, state => state.backlogTaskIds);
export const selectTodaysTaskIds = createSelector(selectTaskFeatureState, state => state.todaysTaskIds);
export const selectCurrentTaskId = createSelector(selectTaskFeatureState, state => state.currentTaskId);
export const selectIsTaskDataLoaded = createSelector(selectTaskFeatureState, state => state.isDataLoaded);
export const selectCurrentTask = createSelector(selectTaskFeatureState, s => s.currentTaskId && s.entities[s.currentTaskId]);
export const selectCurrentTaskParent = createSelector(selectTaskFeatureState, s =>
  s.currentTaskId
  && s.entities[s.currentTaskId] && s.entities[s.currentTaskId].parentId
  && s.entities[s.entities[s.currentTaskId].parentId]
);

export const selectCurrentTaskParentOrCurrent = createSelector(selectTaskFeatureState, s =>
  s.currentTaskId
  && s.entities[s.currentTaskId] && s.entities[s.currentTaskId].parentId
  && s.entities[s.entities[s.currentTaskId].parentId]
  || s.entities[s.currentTaskId]
);


export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);
export const selectAllTasksWithIssueData = createSelector(selectAllTasks, selectIssueEntityMap, mapIssueDataToTask);
export const selectAllStartableTasks = createSelector(selectAllTasks, tasks => tasks.filter(task => task.subTaskIds.length === 0));

export const selectAllTasksWithSubTasks = createSelector(selectAllTasksWithIssueData, mapSubTasksToTasks);


export const selectTodaysTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectTodaysTaskIds, mapTasksFromIds);
export const selectBacklogTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectBacklogTaskIds, mapTasksFromIds);
export const selectTodaysTasksFlat = createSelector(selectTodaysTasksWithSubTasks, flattenTasks);


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
export const selectTotalTimeWorkedOnTodaysTasks = createSelector(selectTodaysTasksWithSubTasks, mapTotalTimeWorked);

export const selectFocusTaskId = createSelector(selectTaskFeatureState, state => state.focusTaskId);

export const selectTasksWithMissingIssueData = createSelector(
  selectAllTasksWithIssueData,
  (tasks) => tasks && tasks
    .filter(
      (task: TaskWithSubTasks) => (!task.issueData && (task.issueType || task.issueId))
    )
);
export const selectIsTriggerPlanningMode = createSelector(
  selectIsTasksLoaded,
  selectTodaysTasksWithSubTasks,
  (isTasksLoaded, tasks) => (isTasksLoaded && (!tasks || !tasks.length))
);

// DYNAMIC SELECTORS
// -----------------
export const selectTaskById = createSelector(
  selectTaskFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);
