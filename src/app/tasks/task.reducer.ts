// import { Action } from '@ngrx/store';
import {
  ADD_SUB_TASK,
  ADD_TASK,
  DELETE_TASK,
  RELOAD_FROM_LS,
  SET_TASK_DONE,
  SET_TASK_UNDONE,
  SYNC,
  UPDATE_TASK
} from './task.actions';
import {Task} from './task';
import {LS_TASKS} from '../app.constants';
import shortid from 'shortid';
import {calcTotalTimeSpent, parseFromLs} from './task-helper-fns';


const INITIAL_TASK_STATE = [];

// export function TaskReducer(state = INITIAL_TASK_STATE, action: Action) {
export function TaskReducer(state = INITIAL_TASK_STATE, action: any) {
  switch (action.type) {
    // TODO: refactor to effects??
    case RELOAD_FROM_LS:
      const TASKS_FROM_LS = JSON.parse(localStorage.getItem(LS_TASKS));

      // create local storage if not done already
      if (!TASKS_FROM_LS || !Array.isArray(TASKS_FROM_LS)) {
        localStorage.setItem(LS_TASKS, JSON.stringify(INITIAL_TASK_STATE));
      }

      const lsTasks: [Task] = parseFromLs(LS_TASKS);
      return [...lsTasks];

    case ADD_TASK:
      const newTask: Task = Object.assign(action.payload, {id: shortid()});
      return [newTask, ...state];

    case DELETE_TASK:
      return state
        .filter((item) => item.id !== action.payload)
        .map((item) => {
          if (item.subTasks) {
            let taskCopy: Task;
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

    case UPDATE_TASK:
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

    case SET_TASK_DONE:
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

    case SET_TASK_UNDONE:
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

    case ADD_SUB_TASK:
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

    case SYNC:
      return state;

    // return action.payload;

    // case GET_CURRENT_TASK:

    default:
      return state;
  }
}