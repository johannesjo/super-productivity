import { TaskActions } from './task.actions';
import { TaskActionTypes } from './task.actions';
import { Task } from '../task';
import shortid from 'shortid';
import { calcTotalTimeSpent } from '../util/calc-total-time-spent';
import { LS_TASKS } from '../task.const';
import { loadFromLs } from '../../shared/local-storage';
import { TasksState } from './task-store';


export function taskReducer(state = [], action: TaskActions): TasksState {
  console.log(action, state);
  switch (action.type) {
    case TaskActionTypes.ReloadFromLs:
      const lsTasks: [Task] = loadFromLs(LS_TASKS);
      if (Array.isArray(lsTasks)) {
        return [...lsTasks];
      } else {
        return state;
      }

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
          const newTask_: Task = {
            id: shortid(),
            parentId: item.id,
            title: '',
            isDone: false
          };


          if (!updatedTask.subTasks) {
            updatedTask.subTasks = [newTask_];
          } else {
            updatedTask.subTasks.push(newTask_);
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
