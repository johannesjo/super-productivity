import {Injectable} from '@angular/core';
import {LS_INITIAL_DIALOG_NR} from '../../core/persistence/ls-keys.const';
import {HttpClient} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {catchError, switchMap, tap, timeout} from 'rxjs/operators';
import {InitialDialogResponse} from './initial-dialog.model';
import {Observable, of} from 'rxjs';
import {DialogInitialComponent} from './dialog-initial/dialog-initial.component';
import {DataInitService} from '../../core/data-init/data-init.service';
import {version} from '../../../../package.json';
import {lt} from 'semver';

const URL = 'https://app.super-productivity.com/news.json';


@Injectable({
  providedIn: 'root'
})
export class InitialDialogService {

  constructor(
    private _http: HttpClient,
    private _matDialog: MatDialog,
    private _dataInitService: DataInitService,
  ) {
  }

  showDialogIfNecessary$(): Observable<any> {
    return this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this._http.get(URL)),
      timeout(3000),
      switchMap((res: InitialDialogResponse) => {
        const lastLocalDialogNr = this._loadDialogNr();
        const isNewUser = !lastLocalDialogNr;

        if (isNewUser && !res.isShowToNewUsers) {
          return of(null);
        } else if (res.dialogNr <= lastLocalDialogNr) {
          return of(null);
        } else if (res.showStartingWithVersion && lt(version, res.showStartingWithVersion)) {
          return of(null);
        } else {
          return this._openDialog$(res).pipe(
            tap(() => {
              this._saveDialogNr(res.dialogNr);
            }),
          );
        }
      }),
      catchError((err) => {
        console.error(err);
        return of(null);
      }),
    );
  }

  private _openDialog$(res: InitialDialogResponse): Observable<any> {
    return this._matDialog.open(DialogInitialComponent, {
      data: res,
    }).afterClosed();
  }

  private _loadDialogNr(): number {
    return +localStorage.getItem(LS_INITIAL_DIALOG_NR) || 0;
  }

  private _saveDialogNr(nr: number = 0) {
    localStorage.setItem(LS_INITIAL_DIALOG_NR, nr.toString());
  }
}
