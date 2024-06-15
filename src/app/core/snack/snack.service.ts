import { Injectable, NgZone } from '@angular/core';
import { Store } from '@ngrx/store';
import { SnackParams } from './snack.model';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DEFAULT_SNACK_CFG } from './snack.const';
import { SnackCustomComponent } from './snack-custom/snack-custom.component';
import { TranslateService } from '@ngx-translate/core';
import {
  LegacySimpleSnackBar as SimpleSnackBar,
  MatLegacySnackBar as MatSnackBar,
  MatLegacySnackBarRef as MatSnackBarRef,
} from '@angular/material/legacy-snack-bar';
import { Actions, ofType } from '@ngrx/effects';
import { setActiveWorkContext } from '../../features/work-context/store/work-context.actions';
import { debounce } from 'helpful-decorators';

@Injectable({
  providedIn: 'root',
})
export class SnackService {
  private _ref?: MatSnackBarRef<SnackCustomComponent | SimpleSnackBar>;

  constructor(
    private _store$: Store<any>,
    private _translateService: TranslateService,
    private _actions$: Actions,
    private _matSnackBar: MatSnackBar,
    private _ngZone: NgZone,
  ) {
    const _onWorkContextChange$: Observable<unknown> = this._actions$.pipe(
      ofType(setActiveWorkContext),
    );
    _onWorkContextChange$.subscribe(() => {
      this.close();
    });
  }

  open(params: SnackParams | string): void {
    if (typeof params === 'string') {
      params = { msg: params };
    }
    this._openSnack(params);
  }

  close(): void {
    if (this._ref) {
      this._ref.dismiss();
    }
  }

  @debounce(100)
  private _openSnack(params: SnackParams): void {
    const _destroy$: Subject<boolean> = new Subject<boolean>();
    const destroySubs = (): void => {
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
      isSpinner,
    } = params;

    const cfg = {
      ...DEFAULT_SNACK_CFG,
      ...config,
      data: {
        ...params,
        msg: isSkipTranslate
          ? msg
          : typeof (msg as unknown) === 'string' &&
            this._translateService.instant(msg, translateParams),
      },
    };

    if (showWhile$ || promise || isSpinner) {
      // TODO check if still needed
      (cfg as any).panelClass = 'polling-snack';
    }

    switch (type) {
      case 'ERROR':
      case 'CUSTOM':
      case 'SUCCESS':
      default: {
        // @see https://stackoverflow.com/questions/50101912/snackbar-position-wrong-when-use-errorhandler-in-angular-5-and-material
        this._ngZone.run(() => {
          this._ref = this._matSnackBar.openFromComponent(SnackCustomComponent, cfg);
        });
        break;
      }
    }

    if (actionStr && actionId && this._ref) {
      this._ref
        .onAction()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          this._store$.dispatch({
            type: actionId,
            payload: actionPayload,
          });
          destroySubs();
        });
      this._ref
        .afterDismissed()
        .pipe(takeUntil(_destroy$))
        .subscribe(() => {
          destroySubs();
        });
    }
  }
}
