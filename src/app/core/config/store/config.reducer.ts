import { ConfigActions, ConfigActionTypes } from './config.actions';

export interface State {
  [key: string]: any;
}

export const initialState: State = {};

export function reducer(state = initialState, action: ConfigActions): State {
  switch (action.type) {

    case ConfigActionTypes.LoadConfigs:
      return state;


    default:
      return state;
  }
}
