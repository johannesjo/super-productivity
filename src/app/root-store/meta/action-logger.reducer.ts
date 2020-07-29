import { RootState } from '../root-state';
import { actionLogger } from '../../util/action-logger';


export const actionLoggerReducer = (reducer: any) => {
  return (state: RootState, action: any) => {
    actionLogger(action);
    return reducer(state, action);
  };
};
