import { TaskActions } from './task.actions';
import { TaskActionTypes } from './task.actions';
import { Task } from '../task';
import shortid from 'shortid';
import { calcTotalTimeSpent } from '../util/calc-total-time-spent';

export interface TasksState extends Array<Task> {
}

export interface TaskSharedState {
  currentTaskId: string;
}

export interface TaskModuleState {
  taskSharedState: TaskSharedState;
  tasks: TasksState;
}


export const INITIAL_FEATURE_STATE: TaskSharedState = {
  currentTaskId: undefined,
};


export function taskSharedStateReducer(state = INITIAL_FEATURE_STATE, action: TaskActions): TaskSharedState {
  console.log(action, state);

  switch (action.type) {
    case TaskActionTypes.SetCurrentTask:
      return Object.assign({}, state, {currentTaskId: action.payload});
    case TaskActionTypes.UnsetCurrentTask:
      return Object.assign({}, state, {currentTaskId: undefined});
    default:
      return state;
  }
}


export function taskReducer(state = [], action: TaskActions): TasksState {
  console.log(action, state);
  switch (action.type) {
    // case TaskActionTypes.ReloadFromLs:
    // const TASKS_FROM_LS = JSON.parse(localStorage.getItem(LS_TASKS));

    // TODO should be done somewhere else
    // create local storage if not done already
    // if (!TASKS_FROM_LS || !Array.isArray(TASKS_FROM_LS)) {
    //   localStorage.setItem(LS_TASKS, JSON.stringify(INITIAL_FEATURE_STATE));
    // }

    // const lsTasks: [Task] = parseFromLs(LS_TASKS);
    // return [...lsTasks];

    case TaskActionTypes.AddTask:
      const newTask: Task = Object.assign(action.payload, {id: shortid()});
      return [newTask, ...state];

    case TaskActionTypes.DeleteTask:
      return state
        .filter((item) => item.id !== action.payload)
        .map((item) => {
          if (item.subTasks) {
            let taskCopy: Task;
            // TODO replace with map
            item.subTasks.forEach((subItem, index) => {
              if (subItem.id === action.payload) {
                taskCopy = Object.assign({}, item);
                taskCopy.subTasks.splice(index, 1);
              }
            });
            return taskCopy || item;
          } else {
            return item;
          }
        });

    case TaskActionTypes.UpdateTask:
      return state.map((item) => {
        // add total time spent
        if (action.payload.changedFields.timeSpentOnDay) {
          action.payload.changedFields.timeSpent = calcTotalTimeSpent(action.payload.changedFields.timeSpentOnDay);
        }

        if (item.id === action.payload.id) {
          return Object.assign({}, item, action.payload.changedFields);
        } else if (item.subTasks) {
          let taskCopy: Task;

          item.subTasks.forEach((subItem, index) => {
            if (subItem.id === action.payload.id) {
              taskCopy = Object.assign({}, item);
              taskCopy.subTasks[index] = Object.assign({}, subItem, action.payload.changedFields);
            }
          });
          return taskCopy || item;
        } else {
          return item;
        }
      });

    case TaskActionTypes.SetTaskDone:
      return state.map((item) => {
        if (item.id === action.payload) {
          return Object.assign({}, item, {isDone: true});
        } else if (item.subTasks) {
          let taskCopy: Task;

          item.subTasks.forEach((subItem, index) => {
            if (subItem.id === action.payload) {
              taskCopy = Object.assign({}, item);
              taskCopy.subTasks[index] = Object.assign({}, subItem, {isDone: true});
            }
          });
          return taskCopy || item;
        } else {
          return item;
        }
      });

    case TaskActionTypes.SetTaskUndone:
      return state.map((item) => {
        if (item.id === action.payload) {
          return Object.assign({}, item, {isDone: false});
        } else if (item.subTasks) {
          let taskCopy: Task;

          item.subTasks.forEach((subItem, index) => {
            if (subItem.id === action.payload) {
              taskCopy = Object.assign({}, item);
              taskCopy.subTasks[index] = Object.assign({}, subItem, {isDone: false});
            }
          });
          return taskCopy || item;
        } else {
          return item;
        }
      });

    case TaskActionTypes.AddSubTask:
      return state.map((item) => {
        if (item.id === action.payload.id) {
          const updatedTask: Task = Object.assign({}, item);
          const newTask: Task = {
            id: shortid(),
            parentId: item.id,
            title: '',
            isDone: false
          };


          if (!updatedTask.subTasks) {
            updatedTask.subTasks = [newTask];
          } else {
            updatedTask.subTasks.push(newTask);
          }

          return updatedTask;
        } else {
          return item;
        }
      });

    default:
      return state;
  }
}
