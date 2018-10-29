import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { CloseDialog, DialogActionTypes } from './dialog.actions';

@Injectable()
export class DialogEffects {

  @Effect()
  openDialog = this.actions$.pipe(
    ofType(LoginActionTypes.OpenLoginDialog),
    exhaustMap(_ => {
      let dialogRef = this.dialog.open(LoginDialog);
      return dialogRef.afterClosed();
    }),
    map((result: any) => {
      if (result === undefined) {
        return new CloseDialog();
      }
      return new LoginDialogSuccess(result);
    }),
  );
  constructor(private actions$: Actions) {}
}
