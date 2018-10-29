import { Action } from '@ngrx/store';
import { DialogCfg } from '../dialog.model';

export enum DialogActionTypes {
  OpenDialog = '[Dialog] Open Dialog',
  CloseDialog = '[Dialog] Close Dialog'
}

export class OpenDialog implements Action {
  readonly type = DialogActionTypes.OpenDialog;

  constructor(public payload: { cfg: DialogCfg }) {
  }
}

export class CloseDialog implements Action {
  readonly type = DialogActionTypes.CloseDialog;
}

export type DialogActions = OpenDialog
  | CloseDialog;
