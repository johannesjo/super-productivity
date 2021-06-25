// HELPER
// ------
import { Task, TaskState, TaskWithSubTasks, TimeSpentOnDay } from '../task.model';
import { calcTotalTimeSpent } from '../util/calc-total-time-spent';
import { taskAdapter } from './task.adapter';
import { filterOutId } from '../../../util/filter-out-id';
import { Update } from '@ngrx/entity';

export const getTaskById = (taskId: string, state: TaskState): Task => {
  if (!state.entities[taskId]) {
    throw new Error('Task not found: ' + taskId);
  } else {
    return state.entities[taskId] as Task;
  }
};

// SHARED REDUCER ACTIONS
// ----------------------
export const reCalcTimesForParentIfParent = (
  parentId: string,
  state: TaskState,
): TaskState => {
  const stateWithTimeEstimate = reCalcTimeEstimateForParentIfParent(parentId, state);
  return reCalcTimeSpentForParentIfParent(parentId, stateWithTimeEstimate);
};

export const reCalcTimeSpentForParentIfParent = (
  parentId: string,
  state: TaskState,
): TaskState => {
  if (parentId) {
    const parentTask: Task = getTaskById(parentId, state);
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id] as Task);
    const timeSpentOnDayParent: { [key: string]: number } = {};

    subTasks.forEach((subTask: Task) => {
      Object.keys(subTask.timeSpentOnDay).forEach((strDate) => {
        if (subTask.timeSpentOnDay[strDate]) {
          if (!timeSpentOnDayParent[strDate]) {
            timeSpentOnDayParent[strDate] = 0;
          }
          timeSpentOnDayParent[strDate] += subTask.timeSpentOnDay[strDate];
        }
      });
    });
    return taskAdapter.updateOne(
      {
        id: parentId,
        changes: {
          timeSpentOnDay: timeSpentOnDayParent,
          timeSpent: calcTotalTimeSpent(timeSpentOnDayParent),
        },
      },
      state,
    );
  } else {
    return state;
  }
};

export const reCalcTimeEstimateForParentIfParent = (
  parentId: string,
  state: TaskState,
): TaskState => {
  if (parentId) {
    const parentTask: Task = state.entities[parentId] as Task;
    const subTasks = parentTask.subTaskIds.map((id) => state.entities[id] as Task);

    return taskAdapter.updateOne(
      {
        id: parentId,
        changes: {
          timeEstimate: subTasks.reduce(
            (acc: number, task: Task) => acc + task.timeEstimate,
            0,
          ),
        },
      },
      state,
    );
  } else {
    return state;
  }
};

export const updateDoneOnForTask = (upd: Update<Task>, state: TaskState): TaskState => {
  const task = state.entities[upd.id] as Task;
  const isToDone = upd.changes.isDone === true;
  const isToUnDone = upd.changes.isDone === false;
  if (isToDone || isToUnDone) {
    const changes = {
      ...(isToDone ? { doneOn: Date.now() } : {}),
      ...(isToUnDone ? { doneOn: null } : {}),
    };
    return taskAdapter.updateOne(
      {
        id: task.id,
        changes,
      },
      state,
    );
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

  const stateAfterUpdate = taskAdapter.updateOne(
    {
      id,
      changes: {
        timeSpentOnDay: newTimeSpentOnDay,
        timeSpent,
      },
    },
    state,
  );

  return task.parentId
    ? reCalcTimeSpentForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

export const updateTimeEstimateForTask = (
  taskId: string,
  newEstimate: number | null = null,
  state: TaskState,
): TaskState => {
  if (typeof newEstimate !== 'number') {
    return state;
  }

  const task = getTaskById(taskId, state);
  const stateAfterUpdate = taskAdapter.updateOne(
    {
      id: taskId,
      changes: {
        timeEstimate: newEstimate,
      },
    },
    state,
  );

  return task.parentId
    ? reCalcTimeEstimateForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

export const deleteTask = (
  state: TaskState,
  taskToDelete: TaskWithSubTasks | Task,
): TaskState => {
  let stateCopy: TaskState = taskAdapter.removeOne(taskToDelete.id, state);

  let currentTaskId =
    state.currentTaskId === taskToDelete.id ? null : state.currentTaskId;

  // PARENT TASK side effects
  // also delete from parent task if any
  if (taskToDelete.parentId) {
    stateCopy = removeTaskFromParentSideEffects(stateCopy, taskToDelete, true);
  }

  // SUB TASK side effects
  // also delete all sub tasks if any
  if (taskToDelete.subTaskIds) {
    stateCopy = taskAdapter.removeMany(taskToDelete.subTaskIds, stateCopy);
    // unset current if one of them is the current task
    currentTaskId =
      !!currentTaskId && taskToDelete.subTaskIds.includes(currentTaskId)
        ? null
        : currentTaskId;
  }

  return {
    ...stateCopy,
    currentTaskId,
  };
};

export const removeTaskFromParentSideEffects = (
  state: TaskState,
  taskToRemove: Task,
  isCopyTimesAfterLast: boolean = false,
): TaskState => {
  const parentId: string = taskToRemove.parentId as string;
  const parentTask = state.entities[parentId] as Task;
  const isWasLastSubTask = parentTask.subTaskIds.length === 1;

  let newState = taskAdapter.updateOne(
    {
      id: parentId,
      changes: {
        subTaskIds: parentTask.subTaskIds.filter(filterOutId(taskToRemove.id)),

        // copy over sub task time stuff if it was the last sub task
        ...(isWasLastSubTask && isCopyTimesAfterLast
          ? {
              timeSpentOnDay: taskToRemove.timeSpentOnDay,
              timeEstimate: taskToRemove.timeEstimate,
            }
          : {}),
      },
    },
    state,
  );
  // also update time spent for parent if it was not copied over from sub task
  if (!isWasLastSubTask || !isCopyTimesAfterLast) {
    newState = reCalcTimeSpentForParentIfParent(parentId, newState);
    newState = reCalcTimeEstimateForParentIfParent(parentId, newState);
  }
  return newState;
};
