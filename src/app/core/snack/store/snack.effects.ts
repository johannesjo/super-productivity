import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SnackActionTypes, SnackClose, SnackOpen } from './snack.actions';
import { Observable, Subject } from 'rxjs';
import { delay, map, takeUntil, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material';
import { Store } from '@ngrx/store';

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
              private store$: Store,
              private matSnackBar: MatSnackBar) {
  }

  private _openSnack(action: SnackOpen) {
    const destroySubs = () => {
      _destroy$.next(true);
      _destroy$.unsubscribe();
    };
    const _destroy$: Subject<boolean> = new Subject<boolean>();
    const {message, actionStr, actionId, config} = action.payload;
    const ref = this.matSnackBar.open(message, actionStr, config);

    if (actionStr && actionId) {
      ref.onAction()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          this.store$.dispatch({
            type: actionId
          });
          destroySubs();
        });
      ref.afterDismissed()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          destroySubs();
        });
    }
  }
}
