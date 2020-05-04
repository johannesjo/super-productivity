import {Injectable} from '@angular/core';
import {LS_INITIAL_DIALOG_NR} from '../../core/persistence/ls-keys.const';
import {HttpClient} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {catchError, switchMap, tap, timeout} from 'rxjs/operators';
import {InitialDialogResponse} from './initial-dialog.model';
import {Observable, of} from 'rxjs';
import {DialogInitialComponent} from './dialog-initial/dialog-initial.component';
import {DataInitService} from '../../core/data-init/data-init.service';

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
        const lastLocal = this._loadDialogNr();
        const isNewUser = !lastLocal;

        // this._openDialog$(res);

        if (isNewUser && !res.isShowToNewUsers) {
          return of(null);
        } else if (res.dialogNr <= lastLocal) {
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
