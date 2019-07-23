import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {SnackActionTypes, SnackClose, SnackOpen} from './snack.actions';
import {Observable, Subject} from 'rxjs';
import {mapTo, takeUntil, tap} from 'rxjs/operators';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import {Store} from '@ngrx/store';
import {SnackCustomComponent} from '../snack-custom/snack-custom.component';
import {DEFAULT_SNACK_CFG} from '../snack.const';
import {ProjectActionTypes} from '../../../features/project/store/project.actions';
import {TranslateService} from '@ngx-translate/core';

@Injectable()
export class SnackEffects {
  @Effect({dispatch: false}) showSnack$: Observable<any> = this.actions$
    .pipe(
      ofType(SnackActionTypes.SnackOpen),
      tap(this._openSnack.bind(this)),
    );


  @Effect() hideOnProjectChange$: Observable<any> = this.actions$
    .pipe(
      ofType(ProjectActionTypes.SetCurrentProject),
      mapTo(new SnackClose()),
    );


  @Effect({dispatch: false}) hideSnack$: Observable<any> = this.actions$
    .pipe(
      ofType(SnackActionTypes.SnackClose),
      tap(() => {
        if (this._ref) {
          this._ref.dismiss();
        }
      }),
    );


  private _ref: MatSnackBarRef<SnackCustomComponent | SimpleSnackBar>;

  constructor(private actions$: Actions,
              private _translateService: TranslateService,
              private store$: Store<any>,
              private matSnackBar: MatSnackBar) {
  }

  private _openSnack(action: SnackOpen) {
    const _destroy$: Subject<boolean> = new Subject<boolean>();
    const destroySubs = () => {
      _destroy$.next(true);
      _destroy$.unsubscribe();
    };
    const {msg, actionStr, actionId, actionPayload, config, type, isSkipTranslate, translateParams, showWhile$, promise, isSpinner} = action.payload;
    const cfg = {
      ...DEFAULT_SNACK_CFG,
      ...config,
      data: {
        ...action.payload,
        msg: (isSkipTranslate)
          ? msg
          : this._translateService.instant(msg, translateParams),
      },
    };

    if (showWhile$ || promise || isSpinner) {
      cfg.panelClass = 'polling-snack';
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
