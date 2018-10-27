import { Action } from '@ngrx/store';
import { MatSnackBarConfig } from '@angular/material';

export enum SnackActionTypes {
  SnackOpen = '[Snack] SnackOpen',
  SnackClose = '[Snack] SnackClose',
}

export class SnackOpen implements Action {
  readonly type = SnackActionTypes.SnackOpen;

  constructor(public payload: {
    message: string,
    action?: string,
    delay?: number,
    config?: MatSnackBarConfig
  }) {
    console.log('SNACK');

  }
}

export class SnackClose implements Action {
  readonly type = SnackActionTypes.SnackClose;
}

export type SnackActions =
  SnackOpen
  | SnackClose;
