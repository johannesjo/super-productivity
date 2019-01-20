import { Injectable } from '@angular/core';
import { SyncService } from '../../imex/sync/sync.service';
import { ConfigService } from '../config/config.service';
import { GoogleDriveSyncConfig } from '../config/config.model';
import { GoogleApiService } from './google-api.service';
import * as moment from 'moment';
import { SnackService } from '../../core/snack/snack.service';
import { MatDialog } from '@angular/material';
import { DialogConfirmDriveSyncLoadComponent } from './dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { DialogConfirmDriveSyncSaveComponent } from './dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { flatMap, map, tap, withLatestFrom } from 'rxjs/operators';
import { from, Observable, throwError } from 'rxjs';
import { Store } from '@ngrx/store';
import { ChangeSyncFileName, SaveForSync, SaveToGoogleDriveFlow } from './store/google-drive-sync.actions';

@Injectable()
export class GoogleDriveSyncService {
  config$ = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));


  private _isSyncingInProgress = false;
  private _config: GoogleDriveSyncConfig;

  constructor(
    private _syncService: SyncService,
    private _configService: ConfigService,
    private _googleApiService: GoogleApiService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _store$: Store<any>,
  ) {
  }

  init() {
    this._configService.cfg$.subscribe((cfg) => {
      this._config = cfg.googleDriveSync;
    });
  }

  updateConfig(data: Partial<GoogleDriveSyncConfig>, isSkipLastActive = false) {
    this._configService.updateSection('googleDriveSync', data, isSkipLastActive);
  }


  changeSyncFileName(newFileName): void {
    this._store$.dispatch(new ChangeSyncFileName({newFileName}));
  }

  saveForSync(): void {
    this._store$.dispatch(new SaveForSync());
  }


  // TODO refactor to effect
  saveTo(isForce = false): void {
    this._store$.dispatch(new SaveToGoogleDriveFlow());
  }


  // TODO refactor to effect
  loadFrom(isSkipPromiseCheck = false, isForce = false): Promise<any> {
    // don't execute sync interactions at the same time
    if (!isSkipPromiseCheck && this._isSyncingInProgress) {
      return Promise.reject('Something in progress');
    }

    const promise = new Promise((resolve, reject) => {
      const loadHandler = () => {
        return this.checkIfRemoteUpdate().toPromise().then((isUpdated) => {
          if (isUpdated || isForce) {
            return this._loadFile().toPromise().then((loadRes) => {
              const backup: AppDataComplete = loadRes.backup;
              const lastActiveLocal = this._syncService.getLastActive();
              const lastActiveRemote = backup.lastActiveTime;

              // update but ask if remote data is not newer than the last local update
              const isSkipConfirm = isForce || (lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal));
              console.log('DriveSync', 'date comparision skipConfirm', isSkipConfirm, lastActiveLocal, lastActiveRemote);

              if (isSkipConfirm) {
                this._import(loadRes);
                resolve(loadRes);
              } else {
                this._openConfirmLoadDialog(lastActiveRemote);
              }

            }, reject);
            // no update required
          } else {
            this._snackService.open({
              type: 'SUCCESS',
              message: `DriveSync: Local data already up to date`
            });
            reject();
          }
        }, reject);
      };

      // when we have no backup file we create one directly
      // TODO refactor
      if (!this._config._backupDocId) {
        this.changeSyncFileName(this._config.syncFileName);
        // .then(() => {
        //   loadHandler();
        // }, reject);
      } else {
        loadHandler();
      }
    });

    // only assign this after promise check
    this._handleInProgress(promise);

    return promise;
  }

  checkIfRemoteUpdate(): Observable<any> {
    const lastSync = this._config._lastSync;
    return this._googleApiService.getFileInfo(this._config._backupDocId)
      .pipe(
        tap((res) => {
          const lastModifiedRemote = res.modifiedDate;
          console.log('CHECK_REMOTE_UPDATED', this._isNewerThan(lastModifiedRemote, lastSync), lastModifiedRemote, lastSync);
        }),
        map((res) => this._isNewerThan(res.modifiedDate, lastSync)),
      );
  }


  private _import(loadRes): Promise<any> {
    const backupData: AppDataComplete = loadRes.backup;
    return this._syncService.loadCompleteSyncData(backupData)
      .then(() => {
        this.updateConfig({
          _lastSync: loadRes.meta.modifiedDate,
        }, true);
        this._syncService.saveLastActive(loadRes.meta.modifiedDate);
      });
  }


  private _showAsyncToast(obs: Observable<any>, msg) {
    this._snackService.open({
      type: 'CUSTOM',
      icon: 'file_upload',
      message: msg,
      isSubtle: true,
      config: {duration: 60000},
      promise: obs.toPromise(),
    });
  }

  // TODO refactor to effect
  private _openConfirmSaveDialog(remoteModified): void {
    const lastActiveLocal = this._syncService.getLastActive();
    this._matDialog.open(DialogConfirmDriveSyncSaveComponent, {
      restoreFocus: true,
      data: {
        loadFromRemote: () => {
          this.loadFrom(true, true)
            .then(loadRes => this._import(loadRes));
        },
        saveToRemote: () => this._save().toPromise(),
        cancel: () => {
        },
        remoteModified: this._formatDate(remoteModified),
        lastActiveLocal: this._formatDate(lastActiveLocal),
        lastSync: this._formatDate(this._config._lastSync),
      }
    });
  }

  // TODO refactor to effect
  private _openConfirmLoadDialog(remoteModified): void {
    const lastActiveLocal = this._syncService.getLastActive();
    this._matDialog.open(DialogConfirmDriveSyncLoadComponent, {
      restoreFocus: true,
      data: {
        loadFromRemote: () => this.loadFrom(true, true)
          .then(loadRes => this._import(loadRes)),
        saveToRemote: () => this._save().toPromise(),
        cancel: () => {
        },
        remoteModified: this._formatDate(remoteModified),
        lastActiveLocal: this._formatDate(lastActiveLocal),
        lastSync: this._formatDate(this._config._lastSync),
      }
    });
  }

  private _save(): Observable<any> {
    console.log('_save');
    return from(this._getLocalAppData()).pipe(
      withLatestFrom(this.config$),
      flatMap(([completeData, cfg]) => {
        console.log('FLATMAP', cfg);

        return this._googleApiService.saveFile(completeData, {
          title: cfg.syncFileName,
          id: cfg._backupDocId,
          editable: true
        });
      }),
      tap((res) => {
        this.updateConfig({
          _backupDocId: res.body.id,
          _lastSync: res.body.modifiedDate,
        }, true);
        console.log('google sync save:', res.body.modifiedDate);
        this._syncService.saveLastActive(res.body.modifiedDate);
      }),
    );
  }

  private _loadFile(): Observable<any> {
    if (!this._config.syncFileName) {
      return throwError('No file name specified');
    }

    return this._googleApiService.loadFile(this._config._backupDocId);
  }

  private _handleInProgress(promise: Promise<any>) {
    this._isSyncingInProgress = true;
    //
    // this._clearMaxRequestDurationTimeout();
    // // block other requests only for a specified amount of itme
    // this._inProgressTimeout = window.setTimeout(() => {
    //   this._isSyncingInProgress = false;
    // }, MAX_REQUEST_DURATION);
    promise
      .then(() => {
        this._isSyncingInProgress = false;
        // this._clearMaxRequestDurationTimeout();
      })
      .catch(() => {
        this._isSyncingInProgress = false;
        // this._clearMaxRequestDurationTimeout();
      })
    ;
  }

  // private _clearMaxRequestDurationTimeout() {
  //   if (this._inProgressTimeout) {
  //     window.clearTimeout(this._inProgressTimeout);
  //   }
  // }


  // UTIL
  // ----
  private _isNewerThan(strDate1, strDate2) {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() > d2.getTime());
  }

  private _isEqual(strDate1, strDate2) {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() === d2.getTime());
  }

  private _getLocalAppData() {
    return this._syncService.getCompleteSyncData();
  }

  private _formatDate(date) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}
