import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {SnackActionTypes, SnackOpen} from './snack.actions';
import {Observable, Subject} from 'rxjs';
import {takeUntil, tap} from 'rxjs/operators';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import {Store} from '@ngrx/store';
import {SnackCustomComponent} from '../snack-custom/snack-custom.component';
import {DEFAULT_SNACK_CFG} from '../snack.const';

@Injectable()
export class SnackEffects {
  // TODO implement this way
  // @Effect({
  //   dispatch: false
  // })
  // closeSnack: Observable<any> = this.actions$
  //   .pipe(
  //     ofType(SnackActionTypes.SnackClose),
  //     tap(() => this.matSnackBar.dismiss())
  //   );

  @Effect({
    dispatch: false
  })
  showSnack: Observable<any> = this.actions$
    .pipe(
      ofType(SnackActionTypes.SnackOpen),
      tap(this._openSnack.bind(this)),
    );


  private _ref: MatSnackBarRef<SnackCustomComponent | SimpleSnackBar>;

  constructor(private actions$: Actions,
              private store$: Store<any>,
              private matSnackBar: MatSnackBar) {
  }

  private _openSnack(action: SnackOpen) {
    const _destroy$: Subject<boolean> = new Subject<boolean>();
    const destroySubs = () => {
      _destroy$.next(true);
      _destroy$.unsubscribe();
    };
    const {msg, actionStr, actionId, actionPayload, config, type, isSubtle} = action.payload;
    const cfg = {
      ...DEFAULT_SNACK_CFG,
      ...config,
      data: action.payload,
    };
    if (isSubtle) {
      cfg.panelClass = 'subtle';
    }

    switch (type) {
      case 'ERROR':
      case 'CUSTOM':
      case 'SUCCESS':
      default: {
        this._ref = this.matSnackBar.openFromComponent(SnackCustomComponent, cfg);
        break;
      }
    }

    if (actionStr && actionId) {
      this._ref.onAction()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          this.store$.dispatch({
            type: actionId,
            payload: actionPayload
          });
          destroySubs();
        });
      this._ref.afterDismissed()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          destroySubs();
        });
    }
  }
}
