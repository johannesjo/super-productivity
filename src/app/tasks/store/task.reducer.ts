import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Task } from './task.model';
import { TaskActions, TaskActionTypes } from './task.actions';

export interface TaskState extends EntityState<Task> {
  // additional entities state properties
  // currentTaskId: string | null;
}

export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();

export const initialState: TaskState = taskAdapter.getInitialState({
  currentTaskId: null,
  // additional entity state properties
  ids: ['123'],
  entities: {
    '123': {
      id: '123',
      title: 'small'
    }
  }
});

console.log(initialState);


export function taskReducer(
  state = initialState,
  action: TaskActions
): TaskState {
  console.log(state, action);

  switch (action.type) {
    case TaskActionTypes.AddTask: {
      return taskAdapter.addOne(action.payload.task, state);
    }

    case TaskActionTypes.UpsertTask: {
      return taskAdapter.upsertOne(action.payload.task, state);
    }

    case TaskActionTypes.AddTasks: {
      return taskAdapter.addMany(action.payload.tasks, state);
    }

    case TaskActionTypes.UpsertTasks: {
      return taskAdapter.upsertMany(action.payload.tasks, state);
    }

    case TaskActionTypes.UpdateTask: {
      return taskAdapter.updateOne(action.payload.task, state);
    }

    case TaskActionTypes.UpdateTasks: {
      return taskAdapter.updateMany(action.payload.tasks, state);
    }

    case TaskActionTypes.DeleteTask: {
      return taskAdapter.removeOne(action.payload.id, state);
    }

    case TaskActionTypes.DeleteTasks: {
      return taskAdapter.removeMany(action.payload.ids, state);
    }

    case TaskActionTypes.LoadTasks: {
      return taskAdapter.addAll(action.payload.tasks, state);
    }

    case TaskActionTypes.ClearTasks: {
      return taskAdapter.removeAll(state);
    }

    default: {
      return state;
    }
  }
}


//
// export function taskReducer(state = [], action: TaskActions): TasksState {
//   console.log(action, state);
//   switch (action.type) {
//     case TaskActionTypes.ReloadFromLs:
//       const lsTasks: [Task] = loadFromLs(LS_TASKS);
//       if (Array.isArray(lsTasks)) {
//         return [...lsTasks];
//       } else {
//         return state;
//       }
//
//     case TaskActionTypes.AddTask:
//       const newTask: Task = Object.assign(action.payload, {id: shortid()});
//       return [newTask, ...state];
//
//     case TaskActionTypes.DeleteTask:
//       return state
//         .filter((item) => item.id !== action.payload)
//         .map((item) => {
//           if (item.subTasks) {
//             let taskCopy: Task;
//             // TODO replace with map
//             item.subTasks.forEach((subItem, index) => {
//               if (subItem.id === action.payload) {
//                 taskCopy = Object.assign({}, item);
//                 taskCopy.subTasks.splice(index, 1);
//               }
//             });
//             return taskCopy || item;
//           } else {
//             return item;
//           }
//         });
//
//     case TaskActionTypes.UpdateTask:
//       return state.map((item) => {
//         // add total time spent
//         if (action.payload.changedFields.timeSpentOnDay) {
//           action.payload.changedFields.timeSpent = calcTotalTimeSpent(action.payload.changedFields.timeSpentOnDay);
//         }
//
//         if (item.id === action.payload.id) {
//           return Object.assign({}, item, action.payload.changedFields);
//         } else if (item.subTasks) {
//           let taskCopy: Task;
//
//           item.subTasks.forEach((subItem, index) => {
//             if (subItem.id === action.payload.id) {
//               taskCopy = Object.assign({}, item);
//               taskCopy.subTasks[index] = Object.assign({}, subItem, action.payload.changedFields);
//             }
//           });
//           return taskCopy || item;
//         } else {
//           return item;
//         }
//       });
//
//     case TaskActionTypes.SetTaskDone:
//       return state.map((item) => {
//         if (item.id === action.payload) {
//           return Object.assign({}, item, {isDone: true});
//         } else if (item.subTasks) {
//           let taskCopy: Task;
//
//           item.subTasks.forEach((subItem, index) => {
//             if (subItem.id === action.payload) {
//               taskCopy = Object.assign({}, item);
//               taskCopy.subTasks[index] = Object.assign({}, subItem, {isDone: true});
//             }
//           });
//           return taskCopy || item;
//         } else {
//           return item;
//         }
//       });
//
//     case TaskActionTypes.SetTaskUndone:
//       return state.map((item) => {
//         if (item.id === action.payload) {
//           return Object.assign({}, item, {isDone: false});
//         } else if (item.subTasks) {
//           let taskCopy: Task;
//
//           item.subTasks.forEach((subItem, index) => {
//             if (subItem.id === action.payload) {
//               taskCopy = Object.assign({}, item);
//               taskCopy.subTasks[index] = Object.assign({}, subItem, {isDone: false});
//             }
//           });
//           return taskCopy || item;
//         } else {
//           return item;
//         }
//       });
//
//     case TaskActionTypes.AddSubTask:
//       return state.map((item) => {
//         if (item.id === action.payload.id) {
//           const updatedTask: Task = Object.assign({}, item);
//           const newTask_: Task = {
//             id: shortid(),
//             parentId: item.id,
//             title: '',
//             isDone: false
//           };
//
//
//           if (!updatedTask.subTasks) {
//             updatedTask.subTasks = [newTask_];
//           } else {
//             updatedTask.subTasks.push(newTask_);
//           }
//
//           return updatedTask;
//         } else {
//           return item;
//         }
//       });
//
//     default:
//       return state;
//   }
// }
