import { RootState } from '../root-state';
import { actionLogger } from '../../util/action-logger';
import { environment } from '../../../environments/environment';

export const actionLoggerReducer = (reducer: any) => {
  return (state: RootState, action: any) => {
    if (environment.production) {
      console.log(action.type, (action as any)?.payload || action);
    }
    actionLogger(action);
    return reducer(state, action);
  };
};
