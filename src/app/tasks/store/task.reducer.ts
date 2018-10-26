import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { TaskActions, TaskActionTypes } from './task.actions';
import { Task, TimeSpentOnDay } from '../task.model';
import { calcTotalTimeSpent } from '../util/calc-total-time-spent';
import { tasks } from 'googleapis/build/src/apis/tasks';
import { arrayMoveLeft, arrayMoveRight } from '../../core/util/array-move';

export const TASK_FEATURE_NAME = 'tasks';
export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();

export interface TaskState extends EntityState<Task> {
  // additional entities state properties
  currentTaskId: string | null;
  focusTaskId: string | null;

  // NOTE: but it is not needed currently
  todaysTaskIds: string[];
  backlogTaskIds: string[];

  // TODO though this not so much maybe
  // todayDoneTasks: string[];
  // todayUnDoneTasks: string[];
}


// REDUCER
// -------
export const initialTaskState: TaskState = taskAdapter.getInitialState({
  currentTaskId: null,
  todaysTaskIds: [],
  backlogTaskIds: [],
  focusTaskId: null,
});

// HELPER
// ------
const moveTaskInArrayByIds = (arr_, id, targetId, isMoveAfter) => {
  if (arr_.includes(id)) {
    const arr = arr_.splice(0);
    arr.splice(arr.indexOf(id), 1);
    const targetIndex = targetId ? arr.indexOf(targetId) : 0;
    arr.splice(targetIndex + (isMoveAfter ? 1 : 0), 0, id);
    return arr;
  } else {
    return arr_;
  }
};

const getTaskById = (taskId: string, state: TaskState) => {
  if (!state.entities[taskId]) {
    throw new Error('Task not found');
  } else {
    return state.entities[taskId];
  }
};

const filterOutId = (idToFilterOut) => (id) => id !== idToFilterOut;

// SHARED REDUCER ACTIONS
// ----------------------
const reCalcTimeSpentForParentIfParent = (parentId, state: TaskState): TaskState => {
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

const reCalcTimeEstimateForParentIfParent = (parentId, state: TaskState): TaskState => {
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

const updateTimeSpentForTask = (
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
    id: id,
    changes: {
      timeSpentOnDay: newTimeSpentOnDay,
      timeSpent: timeSpent,
    }
  }, state);

  return task.parentId
    ? reCalcTimeSpentForParentIfParent(task.parentId, stateAfterUpdate)
    : stateAfterUpdate;
};

const updateTimeEstimateForTask = (
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


// TODO unit test the shit out of this once the model is settled
export function taskReducer(
  state: TaskState = initialTaskState,
  action: TaskActions
): TaskState {
  // console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case TaskActionTypes.LoadState: {
      return {...action.payload.state};
    }

    case TaskActionTypes.SetCurrentTask: {
      return (action.payload)
        ? {
          ...(taskAdapter.updateOne({
            id: action.payload,
            changes: {isDone: false}
          }, state)),
          currentTaskId: action.payload,
        }
        : {
          ...state,
          currentTaskId: action.payload,
        };
    }

    case TaskActionTypes.UnsetCurrentTask: {
      return {...state, currentTaskId: null};
    }

    // Task Actions
    // ------------
    case TaskActionTypes.AddTask: {
      return {
        ...taskAdapter.addOne(action.payload.task, state),
        ...(
          action.payload.isAddToBacklog ? {
            backlogTaskIds: [action.payload.task.id, ...state.backlogTaskIds]
          } : {
            todaysTaskIds: [action.payload.task.id, ...state.todaysTaskIds]
          }
        ),
      };
    }

    case TaskActionTypes.UpdateTask: {
      const taskId = action.payload.task.id as string;
      const timeSpentOnDay = action.payload.task.changes.timeSpentOnDay;
      const timeEstimate = action.payload.task.changes.timeEstimate;
      let stateCopy = updateTimeSpentForTask(taskId, timeSpentOnDay, state);
      stateCopy = updateTimeEstimateForTask(taskId, timeEstimate, stateCopy);
      return taskAdapter.updateOne(action.payload.task, state);
    }


    // TODO also delete related issue :(
    case TaskActionTypes.DeleteTask: {
      let stateCopy: TaskState = taskAdapter.removeOne(action.payload.id, state);

      const taskToDelete: Task = state.entities[action.payload.id];
      let currentTaskId = (state.currentTaskId === action.payload.id) ? null : state.currentTaskId;

      // PARENT TASK side effects
      // also delete from parent task if any
      if (taskToDelete.parentId) {
        stateCopy = taskAdapter.updateOne({
          id: taskToDelete.parentId,
          changes: {
            subTaskIds: stateCopy.entities[taskToDelete.parentId].subTaskIds
              .filter(filterOutId(action.payload.id)),
          }
        }, stateCopy);
        // also update time spent for parent
        stateCopy = reCalcTimeSpentForParentIfParent(taskToDelete.parentId, stateCopy);
        stateCopy = reCalcTimeEstimateForParentIfParent(taskToDelete.parentId, stateCopy);
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
        backlogTaskIds: state.backlogTaskIds.filter(filterOutId(action.payload.id)),
        todaysTaskIds: state.todaysTaskIds.filter(filterOutId(action.payload.id)),
        currentTaskId
      };
    }

    case TaskActionTypes.Move: {
      const id = action.payload.id;
      const targetId = action.payload.targetItemId;
      const isMoveAfter = action.payload.isMoveAfter;
      // TODO handle sub task case
      return {
        ...state,
        ids: moveTaskInArrayByIds(state.ids, id, targetId, isMoveAfter),
        backlogTaskIds: moveTaskInArrayByIds(state.backlogTaskIds, id, targetId, isMoveAfter),
        todaysTaskIds: moveTaskInArrayByIds(state.todaysTaskIds, id, targetId, isMoveAfter),
      };
    }

    case TaskActionTypes.MoveUp: {
      let updatedState = state;
      const id = action.payload.id;
      const taskToMove = state.entities[id];
      if (taskToMove.parentId) {
        const parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
        updatedState = taskAdapter.updateOne({
          id: taskToMove.parentId,
          changes: {
            subTaskIds: arrayMoveLeft(parentSubTasks, id)
          }
        }, updatedState);
      }

      return {
        ...updatedState,
        ids: arrayMoveLeft(state.ids, id),
        backlogTaskIds: arrayMoveLeft(state.backlogTaskIds, id),
        todaysTaskIds: arrayMoveLeft(state.todaysTaskIds, id),
      };
    }


    case TaskActionTypes.MoveDown: {
      let updatedState = state;
      const id = action.payload.id;
      const taskToMove = state.entities[id];
      if (taskToMove.parentId) {
        const parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
        updatedState = taskAdapter.updateOne({
          id: taskToMove.parentId,
          changes: {
            subTaskIds: arrayMoveRight(parentSubTasks, id)
          }
        }, updatedState);
      }

      return {
        ...updatedState,
        ids: arrayMoveRight(state.ids, id),
        backlogTaskIds: arrayMoveRight(state.backlogTaskIds, id),
        todaysTaskIds: arrayMoveRight(state.todaysTaskIds, id),
      };
    }


    case TaskActionTypes.AddTimeSpent: {
      const taskId = action.payload.id;
      const date = action.payload.tick.date;
      const timeSpent = action.payload.tick.duration;

      const task = getTaskById(taskId, state);
      const currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;

      return updateTimeSpentForTask(
        taskId, {
          ...task.timeSpentOnDay,
          [date]: (currentTimeSpentForTickDay + timeSpent)
        },
        state
      );
    }

    case TaskActionTypes.FocusTask: {
      return {...state, focusTaskId: action.payload.id};
    }

    case TaskActionTypes.AddSubTask: {
      // add item1
      const stateCopy = taskAdapter.addOne({
        ...action.payload.task,
        parentId: action.payload.parentId
      }, state);

      // also add to parent task
      const parentTask = stateCopy.entities[action.payload.parentId];
      parentTask.subTaskIds.push(action.payload.task.id);
      return stateCopy;
    }

    case TaskActionTypes.MoveToToday: {
      if (state.todaysTaskIds.includes(action.payload.id)) {
        return state;
      }

      return {
        ...state,
        backlogTaskIds: state.backlogTaskIds.filter(filterOutId(action.payload.id)),
        todaysTaskIds: [...state.todaysTaskIds, action.payload.id],
      };
    }

    case TaskActionTypes.MoveToBacklog: {
      if (state.backlogTaskIds.includes(action.payload.id)) {
        return state;
      }

      return {
        ...state,
        todaysTaskIds: state.todaysTaskIds.filter(filterOutId(action.payload.id)),
        backlogTaskIds: [action.payload.id, ...state.backlogTaskIds],
      };
    }

    case TaskActionTypes.MoveToArchive: {
      return state;
    }


    default: {
      return state;
    }
  }
}
