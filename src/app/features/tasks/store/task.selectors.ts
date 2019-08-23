import {createFeatureSelector, createSelector} from '@ngrx/store';
import {TASK_FEATURE_NAME} from './task.reducer';
import {selectIssueEntityMap} from '../../issue/issue.selector';
import {Task, TaskState, TaskWithIssueData, TaskWithSubTasks} from '../task.model';
import {IssueProviderKey} from '../../issue/issue';
import {filterStartableTasks} from './task.reducer.util';
import {taskAdapter} from './task.adapter';

const mapIssueDataToTask = (tasksIN, issueEntityMap): TaskWithIssueData[] => {
  return tasksIN && tasksIN.map((task) => {
    const issueData = (task.issueId && task.issueType) && issueEntityMap[task.issueType] && issueEntityMap[task.issueType][task.issueId];
    return issueData ? {...task, issueData} : task;
  });
};

const mapSubTasksToTasks = (tasksIN): TaskWithSubTasks[] => {
  return tasksIN.filter((task) => !task.parentId)
    .map((task) => {
      if (task.subTaskIds && task.subTaskIds.length > 0) {
        return {
          ...task,
          subTasks: task.subTaskIds
            .map((subTaskId) => tasksIN.find((taskIN) => taskIN.id === subTaskId))
        };
      } else {
        return task;
      }
    });
};

const mapEstimateRemaining = (tasks): number => tasks && tasks.length && tasks.reduce((acc, task) => {
  let isTrackVal;
  let estimateRemaining;
  if (task.subTasks && task.subTasks.length > 0) {
    estimateRemaining = task.subTasks.reduce((subAcc, subTask) => {
      const estimateRemainingSub = (+subTask.timeEstimate) - (+subTask.timeSpent);
      const isTrackValSub = ((estimateRemainingSub > 0) && !subTask.isDone);
      return subAcc + ((isTrackValSub) ? estimateRemainingSub : 0);
    }, 0);
  } else {
    estimateRemaining = (+task.timeEstimate) - (+task.timeSpent);
  }
  isTrackVal = ((estimateRemaining > 0) && !task.isDone);
  return acc + ((isTrackVal) ? estimateRemaining : 0);
}, 0);


const mapTasksFromIds = (tasksIN, ids) => {
  return ids.map(id => tasksIN.find(task => task.id === id));
};

const flattenTasks = (tasksIN): TaskWithIssueData[] => {
  let flatTasks = [];
  tasksIN.forEach(task => {
    flatTasks.push(task);
    if (task.subTasks) {
      flatTasks = flatTasks.concat(task.subTasks);
    }
  });
  return flatTasks;
};

const mapTotalTimeWorked = (tasks): number => tasks.reduce((acc, task) => acc + task.timeSpent, 0);

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
export const selectCurrentTaskOrParentWithData = createSelector(
  selectTaskFeatureState,
  selectIssueEntityMap,
  (s, issueEntityMap): TaskWithSubTasks => {
    const t = s.currentTaskId
      && s.entities[s.currentTaskId] && s.entities[s.currentTaskId].parentId
      && s.entities[s.entities[s.currentTaskId].parentId] || s.entities[s.currentTaskId];
    if (!t) {
      return;
    }
    const twi: TaskWithIssueData = mapIssueDataToTask([t], issueEntityMap)[0];
    return {
      ...twi,
      subTasks: twi.subTaskIds.map(id => s.entities[id]),
    };
  });

export const selectCurrentTaskParentOrCurrent = createSelector(selectTaskFeatureState, (s): Task =>
  s.currentTaskId
  && s.entities[s.currentTaskId] && s.entities[s.currentTaskId].parentId
  && s.entities[s.entities[s.currentTaskId].parentId]
  || s.entities[s.currentTaskId]
);


export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);
export const selectScheduledTasks = createSelector(selectAllTasks, (tasks) => tasks.filter(task => task.reminderId));
export const selectAllTasksWithIssueData = createSelector(selectAllTasks, selectIssueEntityMap, mapIssueDataToTask);
export const selectStartableTaskIds = createSelector(
  selectTaskFeatureState,
  filterStartableTasks,
);
export const selectStartableTasks = createSelector(
  selectTaskFeatureState,
  (s) =>
    filterStartableTasks(s).map(id => s.entities[id])
);

export const selectAllTasksWithSubTasks = createSelector(selectAllTasksWithIssueData, mapSubTasksToTasks);


export const selectIsTaskForTodayPlanned = createSelector(
  selectTaskFeatureState,
  (state): boolean => !!state.todaysTaskIds && state.todaysTaskIds.length > 0,
);
export const selectTodaysTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectTodaysTaskIds, mapTasksFromIds);
export const selectBacklogTasksWithSubTasks = createSelector(selectAllTasksWithSubTasks, selectBacklogTaskIds, mapTasksFromIds);
export const selectTodaysTasksFlat = createSelector(selectTodaysTasksWithSubTasks, flattenTasks);


export const selectTodaysUnDoneTasksWithSubTasks = createSelector(
  selectTodaysTasksWithSubTasks,
  (tasks): TaskWithSubTasks[] => tasks.filter(task => !task.isDone)
);
export const selectTodaysDoneTasksWithSubTasks = createSelector(
  selectTodaysTasksWithSubTasks,
  (tasks): TaskWithSubTasks[] => tasks.filter(task => task.isDone)
);

export const selectEstimateRemainingForToday = createSelector(selectTodaysTasksWithSubTasks, mapEstimateRemaining);
export const selectEstimateRemainingForBacklog = createSelector(selectBacklogTasksWithSubTasks, mapEstimateRemaining);
export const selectTotalTimeWorkedOnTodaysTasks = createSelector(selectTodaysTasksWithSubTasks, mapTotalTimeWorked);
export const selectEstimatedOnTasksWorkedOnToday$ = createSelector(selectTodaysTasksWithSubTasks, mapTotalTimeWorked);


export const selectFocusTaskId = createSelector(selectTaskFeatureState, state => state.focusTaskId);

export const selectTasksWithMissingIssueData = createSelector(
  selectAllTasksWithIssueData,
  (tasks: TaskWithIssueData[]): TaskWithSubTasks[] => tasks && tasks.filter(
    (task: TaskWithSubTasks) => (!task.issueData && (task.issueType || task.issueId))
  )
);
export const selectHasTasksToWorkOn = createSelector(
  selectIsTasksLoaded,
  selectTodaysTasksWithSubTasks,
  (isTasksLoaded, tasks) => {
    const _tasksToWorkOn = tasks.filter((t) => {
      return !t.isDone &&
        ((!t.subTasks || t.subTasks.length === 0) || t.subTasks.filter(st => !st.isDone).length > 0);
    });
    return (_tasksToWorkOn && _tasksToWorkOn.length > 0);
  }
);

// DYNAMIC SELECTORS
// -----------------
export const selectTaskById = createSelector(
  selectTaskFeatureState,
  (state, props: { id: string }): Task => state.entities[props.id]
);


export const selectTaskByIssueId = createSelector(
  selectTaskFeatureState,
  (state, props: { issueId: string, issueType: IssueProviderKey }): Task => {
    const ids = state.ids as string[];
    const taskId = ids.find(idIN => state.entities[idIN]
      && state.entities[idIN].issueType === props.issueType && state.entities[idIN].issueId === props.issueId);

    return taskId
      ? state.entities[taskId]
      : null;
  }
);
export const selectTasksWorkedOnOrDoneFlat = createSelector(selectTodaysTasksFlat, (tasks, props: { day: string }) => {
  if (!props) {
    return null;
  }

  const todayStr = props.day;
  return tasks.filter(
    (t: Task) => t.isDone || (t.timeSpentOnDay && t.timeSpentOnDay[todayStr] && t.timeSpentOnDay[todayStr] > 0)
  );
});


// REPEATABLE TASKS
// ----------------
export const selectAllRepeatableTaskWithSubTasks = createSelector(
  selectAllTasksWithSubTasks,
  (tasks: TaskWithSubTasks[]) => {
    return tasks.filter(task => !!task.repeatCfgId && task.repeatCfgId !== null);
  }
);
export const selectAllRepeatableTaskWithSubTasksFlat = createSelector(
  selectAllRepeatableTaskWithSubTasks,
  flattenTasks,
);

export const selectTasksByRepeatConfigId = createSelector(
  selectTaskFeatureState,
  (state, props: { repeatCfgId: string }): Task[] => {
    const ids = state.ids as string[];
    const taskIds = ids.filter(idIN => state.entities[idIN]
      && state.entities[idIN].repeatCfgId === props.repeatCfgId);

    return (taskIds && taskIds.length)
      ? taskIds.map(id => state.entities[id])
      : null;
  }
);

export const selectTaskIdsByRepeatConfigId = createSelector(
  selectTaskFeatureState,
  (state, props: { repeatCfgId: string }): string[] => {
    const ids = state.ids as string[];
    return ids.filter(idIN => state.entities[idIN]
      && state.entities[idIN].repeatCfgId === props.repeatCfgId);
  }
);

export const selectTaskWithSubTasksByRepeatConfigId = createSelector(
  selectAllTasksWithSubTasks,
  (tasks: TaskWithSubTasks[], props: { repeatCfgId: string }) => {
    return tasks.filter(task => task.repeatCfgId === props.repeatCfgId);
  }
);

