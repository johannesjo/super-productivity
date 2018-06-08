// import { Action } from '@ngrx/store';
import { RELOAD_FROM_LS, SET_CURRENT_TASK, UNSET_CURRENT_TASK } from './task.actions';
import { LS_CURRENT_TASK } from '../app.constants'

const INITIAL_TASK_STATE = undefined;

// export function CurrentTaskReducer(state = INITIAL_TASK_STATE, action: Action) {
export function CurrentTaskReducer(state = INITIAL_TASK_STATE, action: any) {
  switch (action.type) {
    case RELOAD_FROM_LS:
      return localStorage.getItem(LS_CURRENT_TASK);

    case SET_CURRENT_TASK:
      return action.payload;

    case UNSET_CURRENT_TASK:
      return undefined;

    // case ADD_SUB_TASK:
    //   if(action.payload === state){}

    default:
      return state;
  }
}
