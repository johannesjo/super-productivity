import { ActionReducerMap } from '@ngrx/store';
import { RootState } from './root-state';
// import { taskReducer } from '../tasks/store/task.reducer';

export const reducers: ActionReducerMap<any> = {
  // task: taskReducer
  rootReducer
};

const initialRootState = {};

function rootReducer(
  state: RootState = initialRootState,
  action: any
): RootState {
  return state;
}
