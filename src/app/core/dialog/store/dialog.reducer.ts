import { DialogActions, DialogActionTypes } from './dialog.actions';
import { DialogCfg } from '../dialog.model';

export interface DialogState {
  current: DialogCfg;
  next: DialogCfg[];
}

export const initialState: DialogState = {
  current: null,
  next: []
};

export function reducer(state = initialState, action: DialogActions): DialogState {
  switch (action.type) {

    case DialogActionTypes.OpenDialog:
      const cfg = action.payload.cfg;
      if (state.current) {
        return {...state, next: [...state.next, cfg]};
      }
      return {...state, current: cfg};

    case DialogActionTypes.CloseDialog:
      if (state.next.length) {
        return {
          current: state.next[0],
          next: state.next.slice(1)
        };
      }
      return {next: [], current: null};

    default:
      return state;
  }
}
