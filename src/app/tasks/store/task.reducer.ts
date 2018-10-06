import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Task } from './task.model';
import { TaskActions, TaskActionTypes } from './task.actions';

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
  console.log(state, action);

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

    default: {
      return state;
    }
  }
}
