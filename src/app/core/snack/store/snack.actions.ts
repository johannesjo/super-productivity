import { Action } from '@ngrx/store';
import { SnackParams } from '../snack.model';

export enum SnackActionTypes {
  SnackOpen = '[Snack] SnackOpen',
  SnackClose = '[Snack] SnackClose',
}

export class SnackOpen implements Action {
  readonly type = SnackActionTypes.SnackOpen;

  constructor(public payload: SnackParams) {
  }
}

export class SnackClose implements Action {
  readonly type = SnackActionTypes.SnackClose;
}

export type SnackActions =
  SnackOpen
  | SnackClose;
