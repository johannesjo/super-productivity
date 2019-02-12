import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SnackActionTypes, SnackOpen } from './snack.actions';
import { Observable, Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material';
import { Store } from '@ngrx/store';
import { SnackCustomComponent } from '../snack-custom/snack-custom.component';
import { DEFAULT_SNACK_CFG } from '../snack.const';
import { SnackGoogleLoginComponent } from '../snack-google-login/snack-google-login.component';
import { SnackJiraUnblockComponent } from '../snack-jira-unblock/snack-jira-unblock.component';
import { SnackGlobalErrorComponent } from '../snack-global-error/snack-global-error.component';
import { SnackTakeABreakComponent } from '../snack-take-a-break/snack-take-a-break.component';

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


  private _ref: MatSnackBarRef<SnackCustomComponent
    | SnackJiraUnblockComponent
    | SnackGoogleLoginComponent
    | SimpleSnackBar
    | SnackGlobalErrorComponent
    | SnackTakeABreakComponent>;

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
    const {message, actionStr, actionId, actionPayload, config, type, isSubtle} = action.payload;
    const cfg = {
      ...DEFAULT_SNACK_CFG,
      ...config,
      data: action.payload,
    };
    if (isSubtle) {
      cfg.panelClass = 'subtle';
    }

    switch (type) {
      case 'TAKE_A_BREAK':
        this._ref = this.matSnackBar.openFromComponent(SnackTakeABreakComponent, cfg);
        break;

      case 'GOOGLE_LOGIN':
        this._ref = this.matSnackBar.openFromComponent(SnackGoogleLoginComponent, cfg);
        break;

      case 'JIRA_UNBLOCK':
        this._ref = this.matSnackBar.openFromComponent(SnackJiraUnblockComponent, cfg);
        break;

      case 'GLOBAL_ERROR':
        this._ref = this.matSnackBar.openFromComponent(SnackGlobalErrorComponent, cfg);
        break;

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
