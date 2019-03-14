import { SnackActions, SnackActionTypes } from './snack.actions';

export const SNACK_FEATURE_NAME = 'snack';

export interface SnackState {
  show: boolean;
}

export const initialState: SnackState = {
  show: false,
};

export function reducer(state: SnackState = initialState, action: SnackActions): SnackState {
  switch (action.type) {
    case SnackActionTypes.SnackOpen:
      return {...state, show: true};
    case SnackActionTypes.SnackClose:
      return {...state, show: false};
    default:
      return state;
  }
}
