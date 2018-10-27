import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SnackActionTypes, SnackClose, SnackOpen } from './snack.actions';
import { Observable } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';

@Injectable()
export class SnackEffects {
  @Effect({
    dispatch: false
  })
  closeSnack: Observable<any> = this.actions$
    .pipe(
      ofType(SnackActionTypes.SnackOpen),
      tap(() => this.matSnackBar.dismiss())
    );

  @Effect()
  showSnack: Observable<any> = this.actions$
    .pipe(
      ofType(SnackActionTypes.SnackOpen),
      tap(this._openSnack.bind(this)),
      delay(2000),
      map(() => new SnackClose())
    );

  constructor(private actions$: Actions,
              private matSnackBar: MatSnackBar) {
  }

  private _openSnack(action_: SnackOpen) {
    const {message, action, config} = action_.payload;
    const ref = this.matSnackBar.open(message, action, config);
    if (action) {
      // TODO cleanup sub
      ref.onAction().subscribe(() => {

      });
    }
  }
}
