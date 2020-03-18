import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {SnackParams} from './snack.model';
import {Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {DEFAULT_SNACK_CFG} from './snack.const';
import {SnackCustomComponent} from './snack-custom/snack-custom.component';
import {TranslateService} from '@ngx-translate/core';
import {MatSnackBar, MatSnackBarRef, SimpleSnackBar} from '@angular/material/snack-bar';
import {Actions, ofType} from '@ngrx/effects';
import {ProjectActionTypes} from '../../features/project/store/project.actions';
import {WorkContextService} from '../../features/work-context/work-context.service';
import {setActiveWorkContext} from '../../features/work-context/store/work-context.actions';

@Injectable({
  providedIn: 'root',
})
export class SnackService {
  private _ref: MatSnackBarRef<SnackCustomComponent | SimpleSnackBar>;
  private _onWorkContextChange$: Observable<any> = this._actions$.pipe(ofType(setActiveWorkContext));

  constructor(
    private _store$: Store<any>,
    private _translateService: TranslateService,
    private _actions$: Actions,
    private _matSnackBar: MatSnackBar
  ) {
    this._onWorkContextChange$.subscribe(() => {
      this.close();
    });
  }

  open(params: SnackParams | string) {
    if (typeof params === 'string') {
      params = {msg: params};
    }
    this._openSnack(params);
  }

  close() {
    if (this._ref) {
      this._ref.dismiss();
    }
  }


  private _openSnack(params: SnackParams) {
    const _destroy$: Subject<boolean> = new Subject<boolean>();
    const destroySubs = () => {
      _destroy$.next(true);
      _destroy$.unsubscribe();
    };
    const {
      msg,
      actionStr,
      actionId,
      actionPayload,
      config,
      type,
      isSkipTranslate,
      translateParams = {},
      showWhile$,
      promise,
      isSpinner
    } = params;

    const cfg = {
      ...DEFAULT_SNACK_CFG,
      ...config,
      data: {
        ...params,
        msg: (isSkipTranslate)
          ? msg
          : (typeof msg === 'string') && this._translateService.instant(msg, translateParams),
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
        this._ref = this._matSnackBar.openFromComponent(SnackCustomComponent, cfg);
        break;
      }
    }

    if (actionStr && actionId) {
      this._ref.onAction()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          this._store$.dispatch({
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
