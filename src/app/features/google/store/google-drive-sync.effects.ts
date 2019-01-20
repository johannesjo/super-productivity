import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfigActionTypes, UpdateConfigSection } from '../../config/store/config.actions';
import {
  distinctUntilChanged,
  filter,
  flatMap,
  map,
  mapTo,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { combineLatest, EMPTY, from, interval, Observable, of, throwError } from 'rxjs';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';
import { SnackService } from '../../../core/snack/snack.service';
import {
  ChangeSyncFileName,
  CreateSyncFile,
  GoogleDriveSyncActionTypes,
  LoadFromGoogleDrive,
  LoadFromGoogleDriveFlow,
  LoadFromGoogleDriveSuccess,
  SaveForSync,
  SaveToGoogleDrive,
  SaveToGoogleDriveFlow,
  SaveToGoogleDriveSuccess
} from './google-drive-sync.actions';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material';
import { GoogleDriveSyncConfig } from '../../config/config.model';
import { SyncService } from '../../../imex/sync/sync.service';
import { SnackOpen } from '../../../core/snack/store/snack.actions';
import { DEFAULT_SYNC_FILE_NAME } from '../google.const';
import { DialogConfirmDriveSyncSaveComponent } from '../dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import * as moment from 'moment';
import { DialogConfirmDriveSyncLoadComponent } from '../dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { AppDataComplete } from '../../../imex/sync/sync.model';

@Injectable()
export class GoogleDriveSyncEffects {
  config$ = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));
  private _config: GoogleDriveSyncConfig;

  // TODO check why distinct until changed not working as intended
  isEnabled$ = this.config$.pipe(map(cfg => cfg.isEnabled), distinctUntilChanged());
  isAutoSyncToRemote$ = this.config$.pipe(map(cfg => cfg.isAutoSyncToRemote), distinctUntilChanged());
  syncInterval$ = this.config$.pipe(map(cfg => cfg.syncInterval), distinctUntilChanged());

  @Effect() triggerSync$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
        ConfigActionTypes.UpdateConfigSection,
      ),
      switchMap(() => combineLatest(
        this._googleApiService.isLoggedIn$,
        this.isEnabled$,
        this.isAutoSyncToRemote$,
        this.syncInterval$,
      ).pipe(
        switchMap(([isLoggedIn, isEnabled, isAutoSync, syncInterval]) => {
          // syncInterval = 5000;
          // isLoggedIn = true;
          return (isLoggedIn && isEnabled && isAutoSync && syncInterval >= 5000)
            ? interval(syncInterval).pipe(switchMap(() => of(new SaveForSync())))
            : EMPTY;
        }),
      )),
    );

  @Effect() saveForSync$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.SaveForSync,
      ),
      tap(() => this._showAsyncToast(undefined, 'Syncing to Google Drive')),
      map(() => new SaveToGoogleDriveFlow()),
    );

  @Effect() initialImport$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
      ),
      take(1),
      withLatestFrom(this.config$),
      filter(([act, cfg]) => cfg.isEnabled && cfg.isAutoLogin),
      flatMap(() => from(this._googleApiService.login())),
      flatMap(() => this._checkIfRemoteUpdate()),
      flatMap((isUpdate): any => {
        if (isUpdate) {
          console.log('DriveSync', 'HAS CHANGED (modified Date comparision), TRYING TO UPDATE');

          this._snackService.open({
            message: `DriveSync: There is a remote update! Downloading...`,
            icon: 'file_download',
          });
          return of(new LoadFromGoogleDriveFlow());
        } else {
          return of(new SnackOpen({
            message: `DriveSync: No updated required`,
          }));
        }
      }),
    );


  @Effect() changeSyncFile$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.ChangeSyncFileName,
      ),
      flatMap((action: ChangeSyncFileName) => {
        console.log(action);
        const {newFileName} = action.payload;
        return this._googleApiService.findFile(newFileName).pipe(
          // tslint:disable-next-line
          flatMap((res: any): any => {
            const filesFound = res.items;
            if (filesFound.length && filesFound.length > 1) {
              return of(new SnackOpen({
                type: 'ERROR',
                message: `Multiple files with the name "${newFileName}" found. Please delete all but one or choose a different name.`
              }));
            } else if (!filesFound || filesFound.length === 0) {
              return this._confirmSaveNewFile(newFileName).pipe(
                flatMap((isSave) => {
                  return isSave
                    ? of(new CreateSyncFile({newFileName}))
                    : EMPTY;
                })
              );
            } else if (filesFound.length === 1) {
              return this._confirmUsingExistingFileDialog(newFileName).pipe(
                flatMap((isConfirmUseExisting) => {
                  const fileToUpdate = filesFound[0];
                  return isConfirmUseExisting
                    ? of(this._updateConfig({
                      syncFileName: newFileName,
                      _backupDocId: fileToUpdate.id,
                    }))
                    : EMPTY;
                })
              );
            }
          }),
        );
      }),
    );

  @Effect() createEmptySyncFile$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.CreateSyncFile,
      ),
      flatMap((action: ChangeSyncFileName) => {
        const {newFileName} = action.payload;
        return this._googleApiService.saveFile('', {
          title: newFileName,
          editable: true
        }).pipe(
          map((res: any) => {
            console.log(res);
            return this._updateConfig({
              syncFileName: newFileName,
              _backupDocId: res.id,
              _lastSync: res.modifiedDate,
            }, false);
          }),
        );
      }),
    );

  @Effect() saveToFlow$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.SaveToGoogleDriveFlow,
      ),
      withLatestFrom(this.config$),
      flatMap(([action, cfg]: [SaveToGoogleDrive, GoogleDriveSyncConfig]): any => {
        // when we have no backup file we create one directly
        if (!cfg._backupDocId) {
          return new ChangeSyncFileName({newFileName: cfg.syncFileName || DEFAULT_SYNC_FILE_NAME});
        } else {
          // otherwise update
          return this._googleApiService.getFileInfo(cfg._backupDocId).pipe(
            flatMap((res: any): Observable<any> => {
              console.log(res);
              const lastActiveLocal = this._syncService.getLastActive();
              const lastModifiedRemote = res.modifiedDate;
              console.log('saveTo Check', this._isEqual(lastActiveLocal, lastModifiedRemote), lastModifiedRemote, lastActiveLocal);

              if (this._isEqual(lastActiveLocal, lastModifiedRemote)) {
                return of(new SnackOpen({
                  type: 'SUCCESS',
                  message: `DriveSync: Remote data already up to date`
                }));
              } else if (this._isNewerThan(lastModifiedRemote, cfg._lastSync)) {
                // remote has an update so prompt what to do
                // TODO
                this._openConfirmSaveDialog(lastModifiedRemote);
                return EMPTY;
              } else {
                // local is newer than remote so just save
                return of(new SaveToGoogleDrive());
              }
            }),
          );
        }
      }),
    );
  @Effect() save$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.SaveToGoogleDrive,
      ),
      flatMap((): any => {
        return from(this._getLocalAppData()).pipe(
          withLatestFrom(this.config$),
          flatMap(([completeData, cfg]) => {
            return this._googleApiService.saveFile(completeData, {
              title: cfg.syncFileName,
              id: cfg._backupDocId,
              editable: true
            }).pipe(map(
              (response: any) => new SaveToGoogleDriveSuccess({response})),
            );
          })
        );
      }),
    );

  @Effect() saveSuccess$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess,
      ),
      tap((action: SaveToGoogleDriveSuccess) =>
        this._syncService.saveLastActive(action.payload.response.modifiedDate)),
      switchMap((action: SaveToGoogleDriveSuccess): any => [
          // NOTE: last active needs to be set to exactly the value we get back
          this._updateConfig({
            _backupDocId: action.payload.response.id,
            _lastSync: action.payload.response.modifiedDate,
          }, true),
          new SnackOpen({
            type: 'SUCCESS',
            message: 'Google Drive: Successfully saved backup'
          }),
        ]
      ),
    );


  @Effect() loadFromFlow$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.LoadFromGoogleDriveFlow,
      ),
      withLatestFrom(this.config$),
      flatMap(([action, cfg]: [LoadFromGoogleDrive, GoogleDriveSyncConfig]): any => {
        console.log('LOAD FROM FLOW FLATMAP');
        // when we have no backup file we create one directly
        if (!cfg._backupDocId) {
          return new ChangeSyncFileName({newFileName: cfg.syncFileName || DEFAULT_SYNC_FILE_NAME});
        } else {
          // otherwise update
          return this._checkIfRemoteUpdate().pipe(
            flatMap((isUpdated: boolean): Observable<any> => {
              console.log(isUpdated);
              if (isUpdated) {
                return this._loadFile().pipe(
                  flatMap((loadRes: any): any => {
                    console.log(loadRes);
                    const backup: AppDataComplete = loadRes.backup;
                    const lastActiveLocal = this._syncService.getLastActive();
                    const lastActiveRemote = backup.lastActiveTime;

                    // update but ask if remote data is not newer than the last local update
                    const isSkipConfirm = (lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal));
                    console.log('DriveSync', 'date comparision skipConfirm load', isSkipConfirm, lastActiveLocal, lastActiveRemote);

                    if (isSkipConfirm) {
                      return this._import(loadRes)
                        .pipe(map((modifiedDate) =>
                          new LoadFromGoogleDriveSuccess({modifiedDate})));
                    } else {
                      this._openConfirmLoadDialog(lastActiveRemote);
                      return EMPTY;
                    }
                  }),
                );
                // no update required
              } else {
                return of(new SnackOpen({
                  type: 'SUCCESS',
                  message: `DriveSync: Local data already up to date`
                }));
              }
            }),
          );
        }
      }),
    );
  @Effect() load$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.LoadFromGoogleDrive,
      ),
      withLatestFrom(this.config$),
      flatMap(([act, cfg]): any => this._googleApiService.loadFile(cfg._backupDocId)),
      flatMap((loadRes) => this._import(loadRes)),
      map((modifiedDate) => new LoadFromGoogleDriveSuccess({modifiedDate})),
    );

  // NOTE: not really needed atm
  @Effect() loadSuccess$: any = this._actions$
    .pipe(
      ofType(
        GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess,
      ),
      // NOTE: last active needs to be set to exactly the value we get back
      tap((action: LoadFromGoogleDriveSuccess) => this._syncService.saveLastActive(action.payload.modifiedDate)),
      map((action: LoadFromGoogleDriveSuccess) =>
        this._updateConfig({_lastSync: action.payload.modifiedDate})),
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _googleApiService: GoogleApiService,
    private _configService: ConfigService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _syncService: SyncService,
  ) {
    this._configService.cfg$.subscribe((cfg) => {
      this._config = cfg.googleDriveSync;
    });
  }

  private _checkIfRemoteUpdate(): Observable<any> {
    const lastSync = this._config._lastSync;
    return this._googleApiService.getFileInfo(this._config._backupDocId)
      .pipe(
        tap((res: any) => {
          const lastModifiedRemote = res.modifiedDate;
          console.log('CHECK_REMOTE_UPDATED', this._isNewerThan(lastModifiedRemote, lastSync), lastModifiedRemote, lastSync);
        }),
        map((res: any) => this._isNewerThan(res.modifiedDate, lastSync)),
      );
  }

  private _openConfirmSaveDialog(remoteModified): void {
    const lastActiveLocal = this._syncService.getLastActive();
    this._matDialog.open(DialogConfirmDriveSyncSaveComponent, {
      restoreFocus: true,
      data: {
        loadFromRemote: () => this._store$.dispatch(new LoadFromGoogleDrive()),
        saveToRemote: () => this._store$.dispatch(new SaveToGoogleDrive()),
        remoteModified: this._formatDate(remoteModified),
        lastActiveLocal: this._formatDate(lastActiveLocal),
        lastSync: this._formatDate(this._config._lastSync),
      }
    });
  }

  private _openConfirmLoadDialog(remoteModified): void {
    const lastActiveLocal = this._syncService.getLastActive();
    this._matDialog.open(DialogConfirmDriveSyncLoadComponent, {
      restoreFocus: true,
      data: {
        loadFromRemote: () => this._store$.dispatch(new LoadFromGoogleDrive()),
        saveToRemote: () => this._store$.dispatch(new SaveToGoogleDrive()),
        remoteModified: this._formatDate(remoteModified),
        lastActiveLocal: this._formatDate(lastActiveLocal),
        lastSync: this._formatDate(this._config._lastSync),
      }
    });
  }

  private _showAsyncToast(obs: Observable<any> = EMPTY, msg) {
    this._snackService.open({
      type: 'CUSTOM',
      icon: 'file_upload',
      message: msg,
      isSubtle: true,
      config: {duration: 60000},
      // promise: obs.toPromise(),
    });
  }

  private _confirmSaveNewFile(fileName): Observable<boolean> {
    return this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: `DriveSync: No file with the name <strong>"${fileName}"</strong> was found.
<strong>Create</strong> it as sync file on Google Drive?`,
      }
    }).afterClosed();
  }

  private _confirmUsingExistingFileDialog(fileName): Observable<boolean> {
    return this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: `
DriveSync: Use <strong>existing</strong> file <strong>"${fileName}"</strong> as sync file?
If not please change the Sync file name.`,
      }
    }).afterClosed();
  }

  // DATE HELPER
  private _loadFile(): Observable<any> {
    if (!this._config.syncFileName) {
      return throwError('No file name specified');
    }
    return this._googleApiService.loadFile(this._config._backupDocId);
  }

  private _import(loadRes): Observable<string> {
    const backupData: AppDataComplete = loadRes.backup;
    return from(this._syncService.loadCompleteSyncData(backupData))
      .pipe(mapTo(loadRes.meta.modifiedDate));
  }

  private _updateConfig(data: Partial<GoogleDriveSyncConfig>, isSkipLastActive = false): UpdateConfigSection {
    return new UpdateConfigSection({
      sectionKey: 'googleDriveSync',
      sectionCfg: data,
      isSkipLastActive,
    });
  }


  private _getLocalAppData() {
    return this._syncService.getCompleteSyncData();
  }

  // SIMPLE HELPER
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

  private _formatDate(date) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}


