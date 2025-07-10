import { RootState } from '../root-state';
import { actionLogger } from '../../util/action-logger';
import { ActionReducer } from '@ngrx/store/src/models';
import { Log } from '../../core/log';

export const actionLoggerReducer = (
  reducer: ActionReducer<any, any>,
): ActionReducer<any, any> => {
  return (state: RootState, action: any) => {
    // if (environment.production) {
    Log.verbose('[a]' + action.type, (action as any)?.payload || action);
    actionLogger(action);
    return reducer(state, action);
  };
};
