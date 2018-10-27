import { SnackActions, SnackActionTypes } from './snack.actions';

export interface SnackState {
  show: boolean;
}

export const initialState: SnackState = {
  show: false,
};

export function reducer(state: SnackState = initialState, action: SnackActions): SnackState {
  // console.log(state, action);

  switch (action.type) {
    case SnackActionTypes.SnackOpen:
      return {...state, show: true};
    case SnackActionTypes.SnackClose:
      return {...state, show: false};
    default:
      return state;
  }
}
