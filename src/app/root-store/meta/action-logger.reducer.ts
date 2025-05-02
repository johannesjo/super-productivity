import { RootState } from '../root-state';
import { actionLogger } from '../../util/action-logger';
import { ActionReducer } from '@ngrx/store/src/models';
import { IS_ELECTRON } from '../../app.constants';
import { environment } from '../../../environments/environment';

export const actionLoggerReducer = (
  reducer: ActionReducer<any, any>,
): ActionReducer<any, any> => {
  return (state: RootState, action: any) => {
    // if (environment.production) {
    if (environment.production || IS_ELECTRON) {
      console.log(action.type, (action as any)?.payload || action);
    }
    actionLogger(action);
    return reducer(state, action);
  };
};
