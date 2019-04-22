import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {ConfigActionTypes, UpdateConfigSection} from '../../config/store/config.actions';
import {
  catchError,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  mapTo,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {combineLatest, EMPTY, from, interval, Observable, of, throwError} from 'rxjs';
import {GoogleDriveSyncService} from '../google-drive-sync.service';
import {GoogleApiService} from '../google-api.service';
import {ConfigService} from '../../config/config.service';
import {SnackService} from '../../../core/snack/snack.service';
import {
  ChangeSyncFileName,
  CreateSyncFile,
  GoogleDriveSyncActionTypes,
  LoadFromGoogleDrive,
  LoadFromGoogleDriveCancel,
  LoadFromGoogleDriveFlow,
  LoadFromGoogleDriveSuccess,
  SaveForSync,
  SaveToGoogleDrive,
  SaveToGoogleDriveCancel,
  SaveToGoogleDriveFlow,
  SaveToGoogleDriveSuccess
} from './google-drive-sync.actions';
import {DialogConfirmComponent} from '../../../ui/dialog-confirm/dialog-confirm.component';
import {MatDialog, MatDialogRef} from '@angular/material';
import {GoogleDriveSyncConfig} from '../../config/config.model';
import {SyncService} from '../../../imex/sync/sync.service';
import {SnackOpen} from '../../../core/snack/store/snack.actions';
import {DEFAULT_SYNC_FILE_NAME} from '../google.const';
import {DialogConfirmDriveSyncSaveComponent} from '../dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import * as moment from 'moment-mini';
import {DialogConfirmDriveSyncLoadComponent} from '../dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import {AppDataComplete} from '../../../imex/sync/sync.model';
import {selectIsGoogleDriveSaveInProgress} from './google-drive-sync.reducer';
import {CompressionService} from '../../../core/compression/compression.service';

@Injectable()
export class GoogleDriveSyncEffects {
  config$ = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));
  isEnabled$ = this.config$.pipe(map(cfg => cfg.isEnabled), distinctUntilChanged());
  isAutoSyncToRemote$ = this.config$.pipe(map(cfg => cfg.isAutoSyncToRemote), distinctUntilChanged());
  syncInterval$ = this.config$.pipe(map(cfg => cfg.syncInterval), distinctUntilChanged());

  @Effect() triggerSync$: any = this._actions$.pipe(
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
      filter(([isLoggedIn, isEnabled, isAutoSync, syncInterval]) =>
        isLoggedIn && isEnabled && isAutoSync && syncInterval >= 5000),
      switchMap(([a, b, c, syncInterval]) =>
        interval(syncInterval).pipe(
          // filter(isOnline),
          mapTo(new SaveForSync())
        )
      ),
    )),
  );

  @Effect() saveForSync$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveForSync,
    ),
    tap(() => this._showAsyncToast(
      this._store$.select(selectIsGoogleDriveSaveInProgress),
      'Syncing to Google Drive'
      )
    ),
    map(() => new SaveToGoogleDriveFlow({isSkipSnack: true})),
  );

  @Effect() initialImport$: any = this._actions$.pipe(
    ofType(
      ConfigActionTypes.LoadConfig,
    ),
    take(1),
    withLatestFrom(this.config$),
    filter(([act, cfg]) => cfg.isEnabled && cfg.isAutoLogin),
    concatMap(() => from(this._googleApiService.login(true))),
    concatMap(() => this._checkIfRemoteUpdate()),
    concatMap((isUpdate): any => {
      if (isUpdate) {
        this._snackService.open({
          msg: `DriveSync: There is a remote update! Downloading...`,
          ico: 'file_download',
        });
        return of(new LoadFromGoogleDriveFlow());
      } else {
        return of(new SnackOpen({
          msg: `DriveSync: No updated required`,
        }));
      }
    }),
    catchError(() => of(new SnackOpen({
      type: 'ERROR',
      msg: `DriveSync: Error while trying to import data initially`,
    }))),
  );

  @Effect() changeSyncFile$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.ChangeSyncFileName,
    ),
    // only deal with one change at a time
    exhaustMap((action: ChangeSyncFileName) => {
      const {newFileName} = action.payload;
      return this._googleApiService.findFile(newFileName).pipe(
        concatMap((res: any): any => {
          const filesFound = res.items;
          if (filesFound.length && filesFound.length > 1) {
            return of(new SnackOpen({
              type: 'ERROR',
              msg: `Multiple files with the name "${newFileName}" found. Please delete all but one or choose a different name.`
            }));
          } else if (!filesFound || filesFound.length === 0) {
            return this._confirmSaveNewFile(newFileName).pipe(
              concatMap((isSave) => {
                return isSave
                  ? of(new CreateSyncFile({newFileName}))
                  : EMPTY;
              })
            );
          } else if (filesFound.length === 1) {
            return this._confirmUsingExistingFileDialog(newFileName).pipe(
              concatMap((isConfirmUseExisting) => {
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

  @Effect() createEmptySyncFile$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.CreateSyncFile,
    ),
    map((action: ChangeSyncFileName) => action.payload.newFileName),
    concatMap(newFileName =>
      this._googleApiService.saveFile('', {
        title: newFileName,
        editable: true
      }),
    ),
    map((res: any) => {
      return this._updateConfig({
        syncFileName: res.title,
        _backupDocId: res.id,
        _lastSync: res.modifiedDate,
      }, false);
    }),
  );

  @Effect() saveToFlow$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveToGoogleDriveFlow,
    ),
    withLatestFrom(this.config$),
    concatMap(([action, cfg]: [SaveToGoogleDrive, GoogleDriveSyncConfig]): any => {
      // when we have no backup file we create one directly
      if (!cfg._backupDocId) {
        return of(
          new SaveToGoogleDriveCancel(),
          new ChangeSyncFileName({newFileName: cfg.syncFileName || DEFAULT_SYNC_FILE_NAME}),
        );
      } else {
        // otherwise update
        return this._googleApiService.getFileInfo(cfg._backupDocId).pipe(
          catchError(err => this._handleError(err)),
          concatMap((res: any): Observable<any> => {

            const lastActiveLocal = this._syncService.getLastActive();
            const lastModifiedRemote = res.modifiedDate;

            if (this._isEqual(lastActiveLocal, lastModifiedRemote)) {
              if (!action.payload || !action.payload.isSkipSnack) {
                this._snackService.open({
                  type: 'SUCCESS',
                  msg: `DriveSync: Remote data already up to date`
                });
              }
              return of(new SaveToGoogleDriveCancel());
            } else if (this._isNewerThan(lastModifiedRemote, cfg._lastSync)) {
              // remote has an update so prompt what to do
              this._openConfirmSaveDialog(lastModifiedRemote);
              return of(new SaveToGoogleDriveCancel());
            } else {
              // local is newer than remote so just save
              return of(new SaveToGoogleDrive({isSkipSnack: action.payload && action.payload.isSkipSnack}));
            }
          }),
        );
      }
    }),
    catchError(err => this._handleError(err)),
  );

  @Effect() save$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveToGoogleDrive,
    ),
    concatMap((action: SaveToGoogleDrive): any =>
      from(this._getLocalAppData()).pipe(
        withLatestFrom(this.config$),
        concatMap(([completeData, cfg]) => {
          const contentObs: Observable<string|AppDataComplete> = (cfg.isCompressData)
            ? from(this._compressionService.compressUTF16(JSON.stringify(completeData)))
            : of(completeData);

          return contentObs.pipe(
            concatMap((content) => {
              return this._googleApiService.saveFile(content, {
                title: cfg.syncFileName,
                id: cfg._backupDocId,
                editable: true,
                mimeType: cfg.isCompressData ? 'text/plain' : 'application/json',
              });
            }),
          );
        }),
        map((response: any) => new SaveToGoogleDriveSuccess({
          response,
          isSkipSnack: action.payload && action.payload.isSkipSnack
        })),
        catchError(err => this._handleError(err)),
      )
    ),
  );

  @Effect() saveSuccess$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess,
    ),
    map((action: SaveToGoogleDriveSuccess) => action.payload),
    tap((p) => {
      if (!p.isSkipSnack) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: 'Google Drive: Successfully saved backup'
        });
      }
    }),
    // NOTE: last active needs to be set to exactly the value we get back
    tap((p) => this._syncService.saveLastActive(p.response.modifiedDate)),
    map((p) => this._updateConfig({
        _lastSync: p.response.modifiedDate,
      }, true)
    ),
  );

  @Effect() loadFromFlow$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.LoadFromGoogleDriveFlow,
    ),
    withLatestFrom(this.config$),
    concatMap(([action, cfg]: [LoadFromGoogleDrive, GoogleDriveSyncConfig]): any => {
      // when we have no backup file we create one directly
      if (!cfg._backupDocId) {
        return of(
          new LoadFromGoogleDriveCancel(),
          new ChangeSyncFileName({newFileName: cfg.syncFileName || DEFAULT_SYNC_FILE_NAME})
        );
      } else {
        // otherwise update
        return this._checkIfRemoteUpdate().pipe(
          concatMap((isUpdated: boolean): Observable<any> => {
            if (isUpdated) {
              return this._loadFile().pipe(
                concatMap((loadResponse: any): any => {
                  const backup: AppDataComplete = loadResponse.backup;
                  const lastActiveLocal = this._syncService.getLastActive();
                  const lastActiveRemote = backup.lastActiveTime;

                  // update but ask if remote data is not newer than the last local update
                  const isSkipConfirm = (lastActiveRemote && this._isNewerThan(lastActiveRemote, lastActiveLocal));

                  if (isSkipConfirm) {
                    return of(new LoadFromGoogleDrive({loadResponse}));
                  } else {
                    this._openConfirmLoadDialog(lastActiveRemote);
                    return of(new LoadFromGoogleDriveCancel());
                  }
                }),
                catchError(err => this._handleError(err)),
              );
              // no update required
            } else {
              // TODO refactor optional message to cancel
              this._snackService.open({
                type: 'SUCCESS',
                msg: `DriveSync: Local data already up to date`
              });
              return of(new LoadFromGoogleDriveCancel());
            }
          }),
          catchError(err => this._handleError(err)),
        );
      }
    }),
    catchError(err => this._handleError(err)),
  );

  @Effect() load$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.LoadFromGoogleDrive,
    ),
    withLatestFrom(this.config$),
    concatMap(([act, cfg]: [LoadFromGoogleDrive, GoogleDriveSyncConfig]) => {
      return (act.payload && act.payload.loadResponse)
        ? of(act.payload.loadResponse)
        : this._googleApiService.loadFile(cfg._backupDocId);
    }),
    concatMap((loadRes) => this._import(loadRes)),
    map((modifiedDate) => new LoadFromGoogleDriveSuccess({modifiedDate})),
    catchError(err => this._handleError(err)),
  );

  @Effect() loadSuccess$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess,
    ),
    map((action: LoadFromGoogleDriveSuccess) => action.payload.modifiedDate),
    // NOTE: last active needs to be set to exactly the value we get back
    tap((modifiedDate) => this._syncService.saveLastActive(modifiedDate)),
    map((modifiedDate) => this._updateConfig({_lastSync: modifiedDate}, true)),
  );
  private _config: GoogleDriveSyncConfig;

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _googleApiService: GoogleApiService,
    private _configService: ConfigService,
    private _snackService: SnackService,
    private _compressionService: CompressionService,
    private _matDialog: MatDialog,
    private _syncService: SyncService,
  ) {
    this._configService.cfg$.subscribe((cfg) => {
      this._config = cfg.googleDriveSync;
    });
  }

  private _handleError(err): Observable<any> {
    console.warn('Google Drive Sync Error:', err);
    const errTxt = (typeof err === 'string' && err) || (err.toString && err.toString()) || 'Unknown';
    this._snackService.open({
      type: 'ERROR',
      msg: 'Google Drive Sync Error: ' + errTxt
    });
    return of(new LoadFromGoogleDriveCancel());
  }

  private _checkIfRemoteUpdate(): Observable<any> {
    const lastSync = this._config._lastSync;
    return this._googleApiService.getFileInfo(this._config._backupDocId)
      .pipe(
        tap((res: any) => {
          const lastModifiedRemote = res.modifiedDate;
        }),
        map((res: any) => this._isNewerThan(res.modifiedDate, lastSync)),
      );
  }

  private _openConfirmSaveDialog(remoteModified: string | Date): void {
    // Don't open multiple at the same time
    if (!this._matDialog.openDialogs.length || !this._matDialog.openDialogs.find((modal: MatDialogRef<any>) => {
      return modal.componentInstance.constructor.name === DialogConfirmDriveSyncSaveComponent.name;
    })) {
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
  }

  private _openConfirmLoadDialog(remoteModified: string | Date): void {
    // Don't open multiple at the same time
    if (!this._matDialog.openDialogs.length || !this._matDialog.openDialogs.find((modal: MatDialogRef<any>) => {
      return modal.componentInstance.constructor.name === DialogConfirmDriveSyncLoadComponent.name;
    })) {
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
  }

  private _showAsyncToast(showWhile$: Observable<any> = EMPTY, msg) {
    this._snackService.open({
      type: 'CUSTOM',
      ico: 'file_upload',
      msg: msg,
      isSubtle: true,
      config: {duration: 60000},
      showWhile$,
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
      return throwError({handledError: 'No file name specified'});
    }
    return this._googleApiService.loadFile(this._config._backupDocId);
  }

  private async _import(loadRes): Promise<string> {
    let backupData: AppDataComplete;

    // we attempt this regardless of the option, because data might be compressed anyway
    if (typeof loadRes.backup === 'string') {
      try {
        backupData = JSON.parse(loadRes.backup) as AppDataComplete;
      } catch (e) {
        try {
          const decompressedData = await this._compressionService.decompressUTF16(loadRes.backup);
          backupData = JSON.parse(decompressedData) as AppDataComplete;
        } catch (e) {
          console.error('Drive Sync, invalid data');
          console.warn(e);
        }
      }
    }

    return from(this._syncService.loadCompleteSyncData(backupData))
      .pipe(mapTo(loadRes.meta.modifiedDate))
      .toPromise();
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

  private _formatDate(date: Date | string) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }
}
