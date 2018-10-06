import { LS_CURRENT_TASK_ID } from '../task.const';
import { loadFromLs } from '../../util/local-storage';
import { TaskActions } from './task.actions';
import { TaskActionTypes } from './task.actions';
import { TaskSharedState } from './task-store';

export const INITIAL_FEATURE_STATE: TaskSharedState = {
  currentTaskId: undefined,
};


export function taskSharedStateReducer(state = INITIAL_FEATURE_STATE, action: TaskActions): TaskSharedState {
  switch (action.type) {
    case TaskActionTypes.ReloadFromLs:
      const currentTaskId: string = loadFromLs(LS_CURRENT_TASK_ID);
      return Object.assign({}, state, {currentTaskId: currentTaskId});
    case TaskActionTypes.SetCurrentTask:
      return Object.assign({}, state, {currentTaskId: action.payload});
    case TaskActionTypes.UnsetCurrentTask:
      return Object.assign({}, state, {currentTaskId: undefined});
    default:
      return state;
  }
}