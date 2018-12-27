import { ActionReducer, MetaReducer } from '@ngrx/store';
import { RootState } from "./root-state";

// console.log all actions
export function debug(reducer: ActionReducer<any>): ActionReducer<any> {
  return function (state: RootState, action) {
    // console.log('state', state);
    // console.log('action', action);

    return reducer(state, action);
  };
}

export const metaReducers: MetaReducer<any>[] = [debug];
