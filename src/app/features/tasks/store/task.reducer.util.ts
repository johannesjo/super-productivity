// HELPER
// ------
import {DEFAULT_TASK, Task, TaskState, TaskWithSubTasks, TimeSpentOnDay} from '../task.model';
import {calcTotalTimeSpent} from '../util/calc-total-time-spent';
import {taskAdapter} from './task.adapter';

export const getTaskById = (taskId: string, state: TaskState) => {
  if (!state.entities[taskId]) {
    throw new Error('Task not found');
  } else {
    return state.entities[taskId];
  }
};

export const filterOutId = (idToFilterOut) => (id) => id !== idToFilterOut;

export const mapTaskWithSubTasksToTask = (task: TaskWithSubTasks): Task => {
  const copy = {...DEFAULT_TASK, ...task};
  delete copy.subTasks;
  return copy;
};

// SHARED REDUCER ACTIONS
// ----------------------
export const reCalcTimesForParentIfParent = (parentId, state: TaskState): TaskState => {
  const stateWithTimeEstimate = reCalcTimeEstimateForParentIfParent(parentId, state);
  return reCalcTimeSpentForParentIfParent(parentId, stateWithTimeEstimate);
};

export const reCalcTimeSpentForParentIfParent = (parentId, state: TaskState): TaskState => {
  if (parentId) {
    const parentTask: Task = getTaskById(parentId, state);
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id]);
    const timeSpentOnDayParent = {};

    subTasks.forEach((subTask) => {
      Object.keys(subTask.timeSpentOnDay).forEach(strDate => {
        if (subTask.timeSpentOnDay[strDate]) {
          if (!timeSpentOnDayParent[strDate]) {
            timeSpentOnDayParent[strDate] = 0;
          }
          timeSpentOnDayParent[strDate] += subTask.timeSpentOnDay[strDate];
        }
      });
    });
    return taskAdapter.updateOne({
      id: parentId,
      changes: {
        timeSpentOnDay: timeSpentOnDayParent,
        timeSpent: calcTotalTimeSpent(timeSpentOnDayParent),
      }
    }, state);
  } else {
    return state;
  }
};

export const reCalcTimeEstimateForParentIfParent = (parentId, state: TaskState): TaskState => {
  if (parentId) {
    const parentTask: Task = state.entities[parentId];
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id]);

    return taskAdapter.updateOne({
      id: parentId,
      changes: {
        timeEstimate: subTasks.reduce((acc, task) => acc + task.timeEstimate, 0),
      }
    }, state);
  } else {
    return state;
  }
};

export const updateTimeSpentForTask = (
  id: string,
  newTimeSpentOnDay: TimeSpentOnDay,
  state: TaskState,
): TaskState => {
  if (!newTimeSpentOnDay) {
    return state;
  }

  const task = getTaskById(id, state);
  const timeSpent = calcTotalTimeSpent(newTimeSpentOnDay);

  const stateAfterUpdate = taskAdapter.updateOne({
    id,
    changes: {
      timeSpentOnDay: newTimeSpentOnDay,
      timeSpent,
    }
  }, state);

  return task.parentId
    ? reCalcTimeSpentForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

export const updateTimeEstimateForTask = (
  taskId: string,
  newEstimate: number = null,
  state: TaskState,
): TaskState => {

  if (!newEstimate) {
    return state;
  }

  const task = getTaskById(taskId, state);
  const stateAfterUpdate = taskAdapter.updateOne({
    id: taskId,
    changes: {
      timeEstimate: newEstimate,
    }
  }, state);

  return task.parentId
    ? reCalcTimeEstimateForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

export const deleteTask = (state: TaskState,
                           taskToDelete: TaskWithSubTasks | Task): TaskState => {
  let stateCopy: TaskState = taskAdapter.removeOne(taskToDelete.id, state);

  let currentTaskId = (state.currentTaskId === taskToDelete.id) ? null : state.currentTaskId;

  // PARENT TASK side effects
  // also delete from parent task if any
  if (taskToDelete.parentId) {
    const parentTask = state.entities[taskToDelete.parentId];
    const isWasLastSubTask = (parentTask.subTaskIds.length === 1);
    stateCopy = taskAdapter.updateOne({
      id: taskToDelete.parentId,
      changes: {
        subTaskIds: stateCopy.entities[taskToDelete.parentId].subTaskIds
          .filter(filterOutId(taskToDelete.id)),

        // copy over sub task time stuff if it was the last sub task
        ...(
          (isWasLastSubTask)
            ? {
              timeSpentOnDay: taskToDelete.timeSpentOnDay,
              timeEstimate: taskToDelete.timeEstimate,
            }
            : {}
        )
      }
    }, stateCopy);
    // also update time spent for parent if it was not copied over from sub task
    if (!isWasLastSubTask) {
      stateCopy = reCalcTimeSpentForParentIfParent(taskToDelete.parentId, stateCopy);
      stateCopy = reCalcTimeEstimateForParentIfParent(taskToDelete.parentId, stateCopy);
    }
  }

  // SUB TASK side effects
  // also delete all sub tasks if any
  if (taskToDelete.subTaskIds) {
    stateCopy = taskAdapter.removeMany(taskToDelete.subTaskIds, stateCopy);
    // unset current if one of them is the current task
    currentTaskId = taskToDelete.subTaskIds.includes(currentTaskId) ? null : currentTaskId;
  }

  return {
    ...stateCopy,
    // finally delete from backlog or todays tasks
    // XXXbacklogTaskIds: state.XXXbacklogTaskIds.filter(filterOutId(taskToDelete.id)),
    // XXXtodaysTaskIds: state.XXXtodaysTaskIds.filter(filterOutId(taskToDelete.id)),
    currentTaskId,
    stateBefore: {...state, stateBefore: null}
  };
};

