import { ConfigActions, ConfigActionTypes } from './config.actions';

export interface State {1

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
