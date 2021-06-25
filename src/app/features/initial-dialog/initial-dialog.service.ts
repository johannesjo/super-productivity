import { Injectable } from '@angular/core';
import { LS_INITIAL_DIALOG_NR } from '../../core/persistence/ls-keys.const';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { catchError, filter, switchMap, tap, timeout } from 'rxjs/operators';
import {
  InitialDialogResponse,
  instanceOfInitialDialogResponse,
} from './initial-dialog.model';
import { Observable, of } from 'rxjs';
import { DialogInitialComponent } from './dialog-initial/dialog-initial.component';
import { DataInitService } from '../../core/data-init/data-init.service';
import { lt } from 'semver';
import { GlobalConfigService } from '../config/global-config.service';
import { environment } from '../../../environments/environment';

const URL =
  'https://app.super-productivity.com/news.json?ngsw-bypass=true&no-cache=' + Date.now();

@Injectable({ providedIn: 'root' })
export class InitialDialogService {
  constructor(
    private _http: HttpClient,
    private _matDialog: MatDialog,
    private _dataInitService: DataInitService,
    private _globalConfigService: GlobalConfigService,
  ) {}

  showDialogIfNecessary$(): Observable<any> {
    // if (!environment.production) {
    //   return of(null);
    // }

    return this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this._globalConfigService.misc$),
      filter((miscCfg) => !miscCfg.isDisableInitialDialog),
      switchMap(() => this._http.get(URL).pipe(timeout(4000))),
      switchMap((res: InitialDialogResponse | unknown) => {
        const lastLocalDialogNr = this._loadDialogNr();
        const isNewUser = !lastLocalDialogNr;

        if (!instanceOfInitialDialogResponse(res)) {
          console.error('Invalid initial Dialog response');
          return of(null);
        } else {
          if (isNewUser && !res.isShowToNewUsers) {
            // we need to get started somehow
            if (!lastLocalDialogNr) {
              this._saveDialogNr(1);
            }
            return of(null);
          } else if (res.dialogNr <= lastLocalDialogNr) {
            return of(null);
          } else if (
            res.showStartingWithVersion &&
            lt(environment.version, res.showStartingWithVersion)
          ) {
            return of(null);
          } else {
            return this._openDialog$(res).pipe(
              tap(() => {
                this._saveDialogNr(res.dialogNr);
              }),
            );
          }
        }
      }),
      catchError((err) => {
        console.error('Initial Dialog Error');
        console.error(err);
        return of(null);
      }),
    );
  }

  private _openDialog$(res: InitialDialogResponse): Observable<any> {
    return this._matDialog
      .open(DialogInitialComponent, {
        data: res,
      })
      .afterClosed();
  }

  private _loadDialogNr(): number {
    const v = localStorage.getItem(LS_INITIAL_DIALOG_NR);
    return v ? +v : 0;
  }

  private _saveDialogNr(nr: number = 0) {
    localStorage.setItem(LS_INITIAL_DIALOG_NR, nr.toString());
  }
}
