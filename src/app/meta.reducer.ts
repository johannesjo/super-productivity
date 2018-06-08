import { SET_TASK_DONE } from './tasks/task.actions';

const flattenToDoableTasks = (tasks, currentTaskId) => {
  const result = [];
  tasks.forEach((task) => {
    if (task.subTasks) {
      task.subTasks.forEach((task) => {
        if (!task.isDone && task.id !== currentTaskId) {
          result.push(task);
        }
      });
    } else {
      if (!task.isDone && task.id !== currentTaskId) {
        result.push(task);
      }
    }
  });

  return result;
};

function selectNextTask(reducer) {
  return function (state, action) {

    // console.log('state', state);
    // console.log('action', action);

    switch (action.type) {
      case SET_TASK_DONE:
        // NOTE: we manipulate state.CurrentTaskReducer directly as it is a primitive
        const currentTaskId = state.CurrentTaskReducer;
        let nextTaskId;

        if (currentTaskId === action.payload) {
          const tasks = state.TaskReducer;
          const currentTask = tasks.reduce((acc, task) => {
            if (task.id === currentTaskId) {
              return task;
            } else if (task.subTasks) {
              return task.subTasks.find((subTask) => subTask.id === currentTaskId) || acc;
            }
            return acc;
          });

          const doableTasks = flattenToDoableTasks(tasks, currentTaskId);

          if (doableTasks.length <= 0) {
            nextTaskId = undefined;
          } else if (currentTask.parentId) {
            const parentTask = tasks.find((task) => task.id === currentTask.parentId);
            const doableSiblingTasks = flattenToDoableTasks(parentTask.subTasks, currentTaskId);
            if (doableSiblingTasks.length > 0) {
              nextTaskId = doableSiblingTasks[0].id;
            } else {
              nextTaskId = doableTasks[0].id;
            }

          } else {
            nextTaskId = doableTasks[0].id;
          }
        }

        // NOTE: we manipulate nextTaskId directly as it is a primitive
        return reducer({
          TaskReducer: state.TaskReducer,
          CurrentTaskReducer: nextTaskId
        }, action);

      default:
        return reducer(state, action);
    }
  };
}

export const metaReducers = [selectNextTask];
