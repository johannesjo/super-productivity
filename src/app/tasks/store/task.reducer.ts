import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { TaskActions, TaskActionTypes } from './task.actions';
import { Task } from '../task.model';

export interface TaskState extends EntityState<Task> {
  // additional entities state properties
  currentTaskId: string | null;
}

export const taskAdapter: EntityAdapter<Task> = createEntityAdapter<Task>();

export const initialState: TaskState = taskAdapter.getInitialState({
  currentTaskId: null,
});

export function taskReducer(
  state = initialState,
  action: TaskActions
): TaskState {
  console.log(state.entities, state, action);

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
      const stateCopy = taskAdapter.addOne(taskWithParentId, state);
      const parentTask = stateCopy.entities[action.payload.parentId];
      parentTask.subTasks.push(action.payload.task.id);
      return stateCopy;
    }

    default: {
      return state;
    }
  }
}
