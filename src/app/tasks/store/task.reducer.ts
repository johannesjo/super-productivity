import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { TaskActions, TaskActionTypes } from './task.actions';
import { Task } from '../task.model';
import { createFeatureSelector } from '@ngrx/store';
import { createSelector } from '@ngrx/store';

export const TASK_FEATURE_NAME = 'tasks';

export interface TaskState extends EntityState<Task> {
  // additional entities state properties
  currentTaskId: string | null;
}

export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();


// SELECTORS
// ---------
export const selectTaskFeatureState = createFeatureSelector<TaskState>(TASK_FEATURE_NAME);

const {selectIds, selectEntities, selectAll, selectTotal} = taskAdapter.getSelectors();

export const selectTaskIds = createSelector(selectTaskFeatureState, selectIds);
export const selectTaskEntities = createSelector(selectTaskFeatureState, selectEntities);
export const selectAllTasks = createSelector(selectTaskFeatureState, selectAll);

// select the total user count
export const selectTaskTotal = createSelector(selectTaskFeatureState, selectTotal);

export const selectCurrentTask = createSelector(selectTaskFeatureState, state => state.currentTaskId);

export const selectMainTasksWithSubTasks = createSelector(
  selectAllTasks,
  tasks => tasks
    .filter((task) => !task.parentId)
    .map((task) => {
      if (task.subTasks && task.subTasks.length > 0) {
        const newTask: any = Object.assign({}, task);
        newTask.subTasks = task.subTasks
          .map((subTaskId) => {
            return tasks.find((task_) => task_.id === subTaskId);
          })
          .filter((subTask) => !!subTask);
        return newTask;
      } else {
        return task;
      }
    })
);


// REDUCER
// -------
export const initialState: TaskState = taskAdapter.getInitialState({
  currentTaskId: null,
});

export function taskReducer(
  state = initialState,
  action: TaskActions
): TaskState {
  // console.log(state.entities, state, action);

  switch (action.type) {
    // Meta Actions
    // ------------
    case TaskActionTypes.LoadState: {
      return Object.assign({}, action.payload.state);
    }

    case TaskActionTypes.SetCurrentTask: {
      return Object.assign({}, state, {currentTaskId: action.payload});
    }

    case TaskActionTypes.UnsetCurrentTask: {
      return Object.assign({}, state, {currentTaskId: null});
    }

    // Task Actions
    // ------------
    case TaskActionTypes.AddTask: {
      return taskAdapter.addOne(action.payload.task, state);
    }

    case TaskActionTypes.AddTasks: {
      return taskAdapter.addMany(action.payload.tasks, state);
    }

    case TaskActionTypes.UpdateTask: {
      return taskAdapter.updateOne(action.payload.task, state);
    }

    case TaskActionTypes.UpdateTasks: {
      return taskAdapter.updateMany(action.payload.tasks, state);
    }

    case TaskActionTypes.DeleteTask: {
      const parentId = state.entities[action.payload.id].parentId;
      // delete entry
      const stateCopy = taskAdapter.removeOne(action.payload.id, state);
      // also delete from parent task
      if (parentId) {
        const subTasksArray = stateCopy.entities[parentId].subTasks;
        subTasksArray.splice(subTasksArray.indexOf(action.payload.id), 1);
      }
      return stateCopy;
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

    case TaskActionTypes.MoveAfter: {
      const newStateIds: string[] = state.ids.slice(0) as string[];
      newStateIds.splice(newStateIds.indexOf(action.payload.taskId), 1);
      const targetIndex = action.payload.targetItemId ? newStateIds.indexOf(action.payload.targetItemId) : 0;
      newStateIds.splice(targetIndex, 0, action.payload.taskId);

      return Object.assign({}, state, {
        ids: newStateIds,
      });
    }

    case TaskActionTypes.AddSubTask: {
      const taskWithParentId = Object.assign(action.payload.task, {parentId: action.payload.parentId});
      // add item
      const stateCopy = taskAdapter.addOne(taskWithParentId, state);
      // also add to parent task
      const parentTask = stateCopy.entities[action.payload.parentId];
      parentTask.subTasks.push(action.payload.task.id);
      return stateCopy;
    }

    default: {
      return state;
    }
  }
}
