import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { GlobalConfigActionTypes, UpdateGlobalConfigSection } from '../../config/store/global-config.actions';
import {
  catchError,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  mapTo,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { combineLatest, EMPTY, from, Observable, of, throwError, zip } from 'rxjs';
import { GoogleApiService } from '../google-api.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { SnackService } from '../../../core/snack/snack.service';
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
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { GoogleDriveSyncConfig } from '../../config/global-config.model';
import { DataImportService } from '../../../imex/sync/data-import.service';
import { DEFAULT_SYNC_FILE_NAME } from '../google.const';
import { DialogConfirmDriveSyncSaveComponent } from '../dialog-confirm-drive-sync-save/dialog-confirm-drive-sync-save.component';
import * as moment from 'moment';
import { DialogConfirmDriveSyncLoadComponent } from '../dialog-confirm-drive-sync-load/dialog-confirm-drive-sync-load.component';
import { AppDataComplete } from '../../../imex/sync/sync.model';
import { selectIsGoogleDriveSaveInProgress } from './google-drive-sync.reducer';
import { CompressionService } from '../../../core/compression/compression.service';
import { T } from '../../../t.const';
import { SyncService } from '../../../imex/sync/sync.service';
import { SyncProvider } from '../../../imex/sync/sync-provider';
import { HANDLED_ERROR_PROP_STR } from '../../../app.constants';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { getGoogleLocalLastSync, saveGoogleLocalLastSync } from '../google-session';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { PersistenceService } from '../../../core/persistence/persistence.service';

@Injectable()
export class GoogleDriveSyncEffects {
  config$: Observable<GoogleDriveSyncConfig> = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));
  isEnabled$: Observable<boolean> = this.config$.pipe(map(cfg => cfg.isEnabled), distinctUntilChanged());
  isAutoSyncToRemote$: Observable<boolean> = this.config$.pipe(map(cfg => cfg.isAutoSyncToRemote), distinctUntilChanged());
  syncInterval$: Observable<number> = this.config$.pipe(map(cfg => cfg.syncInterval), distinctUntilChanged());
  isInitialSyncDone: boolean = false;

  @Effect() triggerSync$: any = this._actions$.pipe(
    ofType(
      loadAllData.type,
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    switchMap(() => this._dataInitService.isAllDataLoadedInitially$),
    switchMap(() => combineLatest([
      this._googleApiService.isLoggedIn$,
      this.isEnabled$,
      this.isAutoSyncToRemote$,
      this.syncInterval$,
    ]).pipe(
      filter(([isLoggedIn, isEnabled, isAutoSync, syncInterval]) =>
        isLoggedIn && isEnabled && isAutoSync && syncInterval >= 5000),
      switchMap(([, , , syncInterval]) =>
        this._syncService.getSyncTrigger$(syncInterval).pipe(
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
      T.F.GOOGLE.S.SYNCING
      )
    ),
    map(() => new SaveToGoogleDriveFlow({isSkipSnack: true})),
  );

  @Effect() initialImport$: any = this._dataInitService.isAllDataLoadedInitially$.pipe(
    // this._actions$.pipe(
    // ofType(
    //   GlobalConfigActionTypes.LoadGlobalConfig,
    // ),
    // take(1),
    withLatestFrom(this.config$),
    filter(([act, cfg]) => cfg.isEnabled && cfg.isAutoLogin),
    concatMap(() => from(this._googleApiService.login(true))),
    concatMap(() => this._checkIfRemoteUpdate$()),
    concatMap((isUpdate): any => {
      if (isUpdate) {
        this._snackService.open({
          msg: T.F.GOOGLE.S.DOWNLOADING_UPDATE,
          ico: 'file_download',
        });
        return of(new LoadFromGoogleDriveFlow());
      } else {
        this._snackService.open(T.F.GOOGLE.S.NO_UPDATE_REQUIRED);
        this._setInitialSyncDone();
        return EMPTY;
      }
    }),
    catchError(() => {
      this._setInitialSyncDone();
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.GOOGLE.S.ERROR_INITIAL_IMPORT,
      });
      return EMPTY;
    }),
  );

  @Effect() changeSyncFile$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.ChangeSyncFileName,
    ),
    // only deal with one change at a time
    exhaustMap((action: ChangeSyncFileName) => {
      const {newFileName} = action.payload;
      return this._googleApiService.findFile$(newFileName).pipe(
        concatMap((res: any): any => {
          const filesFound = res.items;
          if (filesFound.length && filesFound.length > 1) {
            this._snackService.open({
              type: 'ERROR',
              msg: T.F.GOOGLE.S.MULTIPLE_SYNC_FILES_WITH_SAME_NAME,
              translateParams: {newFileName},
            });
            return EMPTY;
          } else if (!filesFound || filesFound.length === 0) {
            return this._confirmSaveNewFile$(newFileName).pipe(
              concatMap((isSave) => {
                return isSave
                  ? of(new CreateSyncFile({newFileName}))
                  : EMPTY;
              })
            );
          } else if (filesFound.length === 1) {
            return this._confirmUsingExistingFileDialog$(newFileName).pipe(
              concatMap((isConfirmUseExisting) => {
                const fileToUpdate = filesFound[0];
                saveGoogleLocalLastSync(null);
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
      this._googleApiService.saveFile$('', {
        title: newFileName,
        editable: true
      }),
    ),
    map((res: any) => {
      saveGoogleLocalLastSync(res.modifiedDate);
      return this._updateConfig({
        syncFileName: res.title,
        _backupDocId: res.id,
      });
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
        return this._googleApiService.getFileInfo$(cfg._backupDocId).pipe(
          catchError(err => this._handleErrorForSave$(err)),
          concatMap((res: any): Observable<any> => {
            // if we don't have any local changes (unlikely) we assume its the lowest possible value
            const lastLocalSyncModelChange: number = this._persistenceService.getLastLocalSyncModelChange() || 0;
            const lastModifiedRemote: string = res.modifiedDate;
            const lastSync = getGoogleLocalLastSync();

            if (lastSync === null) {
              // never synced so ask what to do
              this._openConfirmSaveDialog(lastModifiedRemote);
              return of(new SaveToGoogleDriveCancel());
            } else if (this._isEqual(lastLocalSyncModelChange, lastModifiedRemote)) {
              if (!action.payload || !action.payload.isSkipSnack) {
                this._snackService.open({
                  type: 'SUCCESS',
                  msg: T.F.GOOGLE.S.REMOTE_UP_TO_DATE,
                });
              }
              return of(new SaveToGoogleDriveCancel());

            } else if (this._isNewerThan(lastModifiedRemote, lastSync)) {
              if (this._isEqual(lastSync, lastLocalSyncModelChange)) {
                return of(new SaveToGoogleDriveCancel(), new LoadFromGoogleDriveFlow());
              } else {
                // remote has an update so prompt what to do
                this._openConfirmSaveDialog(lastModifiedRemote);
              }
              return of(new SaveToGoogleDriveCancel());

            } else {
              // local is newer than remote so just save
              return of(new SaveToGoogleDrive({isSkipSnack: action.payload && action.payload.isSkipSnack}));
            }
          }),
        );
      }
    }),
    catchError(err => this._handleErrorForSave$(err)),
  );

  @Effect() save$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveToGoogleDrive,
    ),
    concatMap((action: SaveToGoogleDrive): any =>
      from(this._getLocalAppData()).pipe(
        withLatestFrom(this.config$),
        concatMap(([completeData, cfg]) => {
          const contentObs: Observable<string | AppDataComplete> = (cfg.isCompressData)
            ? from(this._compressionService.compressUTF16(JSON.stringify(completeData)))
            : of(completeData);

          return contentObs.pipe(
            concatMap((content) => {
              return this._googleApiService.saveFile$(content, {
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
        catchError(err => this._handleErrorForSave$(err)),
      )
    ),
  );

  @Effect({dispatch: false}) saveSuccess$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess,
    ),
    map((action: SaveToGoogleDriveSuccess) => action.payload),
    tap((p) => {
      if (!p.isSkipSnack) {
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.GOOGLE.S.SUCCESS,
        });
      }
    }),
    // NOTE: last active needs to be set to exactly the value we get back
    tap((p) => this.saveLastLocalSyncModelChange(p.response.modifiedDate)),
    tap((p) => saveGoogleLocalLastSync(p.response.modifiedDate))
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
        return this._checkIfRemoteUpdate$().pipe(
          concatMap((isUpdated: boolean): Observable<any> => {
            if (isUpdated) {
              return this._loadFile$().pipe(
                concatMap((loadRes) => {
                  return zip(
                    of(loadRes),
                    this._decodeAppDataIfNeeded(loadRes.backup)
                  );
                }),
                concatMap(([loadResponse, appData]: [any, AppDataComplete]): any => {
                  // if we don't have any local changes (unlikely) we assume its the lowest possible value
                  const lastLocalSyncModelChange = this._persistenceService.getLastLocalSyncModelChange() || 0;

                  const lastLocalSyncModelChangeRemote = appData.lastLocalSyncModelChange
                    // NOTE: needed to support previous property name
                    || (appData as any).lastActiveTime;

                  // update but ask if remote data is not newer than the last local update
                  const isSkipConfirm = (
                    lastLocalSyncModelChangeRemote && this._isNewerThan(lastLocalSyncModelChangeRemote, lastLocalSyncModelChange)
                  );
                  console.log(isSkipConfirm, lastLocalSyncModelChangeRemote, lastLocalSyncModelChange, appData);

                  if (isSkipConfirm) {
                    return of(new LoadFromGoogleDrive({
                      // NOTE: to prevent having to decode again
                      ...loadResponse,
                      backup: appData,
                    }));
                  } else {
                    this._openConfirmLoadDialog(lastLocalSyncModelChangeRemote);
                    return of(new LoadFromGoogleDriveCancel());
                  }
                }),
                catchError(err => this._handleErrorForLoad$(err)),
              );
              // no update required
            } else {
              // TODO refactor optional message to cancel
              this._snackService.open({
                type: 'SUCCESS',
                msg: T.F.GOOGLE.S.LOCAL_UP_TO_DATE,
              });
              return of(new LoadFromGoogleDriveCancel());
            }
          }),
          catchError(err => this._handleErrorForLoad$(err)),
        );
      }
    }),
    catchError(err => this._handleErrorForLoad$(err)),
  );

  @Effect() load$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.LoadFromGoogleDrive,
    ),
    withLatestFrom(this.config$),
    concatMap(([act, cfg]: [LoadFromGoogleDrive, GoogleDriveSyncConfig]) => {
      return (act.payload && act.payload.loadResponse)
        ? of(act.payload.loadResponse)
        : this._googleApiService.loadFile$(cfg._backupDocId);
    }),
    concatMap((loadRes) => this._import(loadRes)),
    map((modifiedDate) => new LoadFromGoogleDriveSuccess({modifiedDate})),
    catchError(err => this._handleErrorForLoad$(err)),
  );

  @Effect({dispatch: false}) loadSuccess$: any = this._actions$.pipe(
    ofType(
      GoogleDriveSyncActionTypes.LoadFromGoogleDriveSuccess,
    ),
    map((action: LoadFromGoogleDriveSuccess) => action.payload.modifiedDate),
    // NOTE: last active needs to be set to exactly the value we get back
    tap((modifiedDate) => this.saveLastLocalSyncModelChange(modifiedDate as any)),
    tap(() => this._setInitialSyncDone()),
    tap((modifiedDate) => saveGoogleLocalLastSync(modifiedDate as string)),
  );

  private _config?: GoogleDriveSyncConfig;

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleApiService: GoogleApiService,
    private _configService: GlobalConfigService,
    private _syncService: SyncService,
    private _snackService: SnackService,
    private _compressionService: CompressionService,
    private _matDialog: MatDialog,
    private _dataInitService: DataInitService,
    private _dataImportService: DataImportService,
    private _persistenceService: PersistenceService,
  ) {
    this._configService.cfg$.subscribe((cfg) => {
      this._config = cfg.googleDriveSync;
    });
  }

  private _handleErrorForSave$(err: any): Observable<any> {
    return of(new SaveToGoogleDriveCancel());
  }

  private _handleErrorForLoad$(err: any): Observable<any> {
    this._setInitialSyncDone();
    return of(new LoadFromGoogleDriveCancel());
  }

  private _checkIfRemoteUpdate$(): Observable<boolean> {
    const lastSync = getGoogleLocalLastSync();
    if (!this._config) {
      throw new Error('No cfg');
    }

    return this._googleApiService.getFileInfo$(this._config._backupDocId)
      .pipe(
        tap(res => console.log(this._formatDate(res.modifiedDate))),
        tap(res => console.log(lastSync && this._formatDate(lastSync))),
        tap(res => console.log(this._isNewerThan(res.modifiedDate, lastSync || 0), res.modifiedDate, lastSync)),
        map((res: any) => this._isNewerThan(res.modifiedDate, lastSync || 0)),
      );
  }

  private _openConfirmSaveDialog(remoteModified: string): void {
    // Don't open multiple at the same time
    if (!this._matDialog.openDialogs.length || !this._matDialog.openDialogs.find((modal: MatDialogRef<any>) => {
      return modal.componentInstance.constructor.name === DialogConfirmDriveSyncSaveComponent.name;
    })) {
      const lastLocalSyncModelChange = this._persistenceService.getLastLocalSyncModelChange();
      const googleLocalLastSync = getGoogleLocalLastSync();
      this._matDialog.open(DialogConfirmDriveSyncSaveComponent, {
        restoreFocus: true,
        data: {
          loadFromRemote: () => this._store$.dispatch(new LoadFromGoogleDrive()),
          saveToRemote: () => this._store$.dispatch(new SaveToGoogleDrive()),
          remoteModified: this._formatDate(remoteModified),
          lastLocalSyncModelChange: !!lastLocalSyncModelChange
            ? this._formatDate(lastLocalSyncModelChange)
            : '–',
          lastSync: googleLocalLastSync
            ? this._formatDate(googleLocalLastSync)
            : '–',
        }
      });
    }
  }

  private _openConfirmLoadDialog(remoteModified: string | number | Date): void {
    // Don't open multiple at the same time
    if (!this._matDialog.openDialogs.length || !this._matDialog.openDialogs.find((modal: MatDialogRef<any>) => {
      return modal.componentInstance.constructor.name === DialogConfirmDriveSyncLoadComponent.name;
    })) {
      const lastLocalSyncModelChange = this._persistenceService.getLastLocalSyncModelChange();
      const googleLocalLastSync = getGoogleLocalLastSync();
      this._matDialog.open(DialogConfirmDriveSyncLoadComponent, {
        restoreFocus: true,
        data: {
          loadFromRemote: () => this._store$.dispatch(new LoadFromGoogleDrive()),
          saveToRemote: () => {
            this._setInitialSyncDone();
            this._store$.dispatch(new SaveToGoogleDrive());
          },
          remoteModified: this._formatDate(remoteModified),
          lastLocalSyncModelChange: !!lastLocalSyncModelChange
            ? this._formatDate(lastLocalSyncModelChange)
            : '–',
          lastSync: googleLocalLastSync
            ? this._formatDate(googleLocalLastSync)
            : '–',
        }
      }).afterClosed().subscribe((isCanceled) => {
        if (isCanceled) {
          this._setInitialSyncDone();
        }
      });
    }
  }

  private _showAsyncToast(showWhile$: Observable<any> = EMPTY, msg: string) {
    this._snackService.open({
      type: 'CUSTOM',
      ico: 'file_upload',
      msg,
      config: {duration: 60000},
      showWhile$,
    });
  }

  private _confirmSaveNewFile$(fileName: string): Observable<boolean> {
    return this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: T.F.GOOGLE.DIALOG.CREATE_SYNC_FILE,
        translateParams: {fileName},
      }
    }).afterClosed();
  }

  private _confirmUsingExistingFileDialog$(fileName: string): Observable<boolean> {
    return this._matDialog.open(DialogConfirmComponent, {
      restoreFocus: true,
      data: {
        message: T.F.GOOGLE.DIALOG.USE_EXISTING_SYNC_FILE,
        translateParams: {fileName},
      }
    }).afterClosed();
  }

  // DATE HELPER
  private _loadFile$(): Observable<any> {
    if (!this._config) {
      throw new Error('No cfg');
    }
    if (!this._config.syncFileName) {
      return throwError({[HANDLED_ERROR_PROP_STR]: 'No file name specified'});
    }
    return this._googleApiService.loadFile$(this._config._backupDocId);
  }

  private async _import(loadRes: any): Promise<string> {
    const backupData: AppDataComplete = await this._decodeAppDataIfNeeded(loadRes.backup);

    return from(this._dataImportService.importCompleteSyncData(backupData))
      .pipe(mapTo(loadRes.meta.modifiedDate))
      .toPromise();
  }

  private async _decodeAppDataIfNeeded(backupStr: string | AppDataComplete): Promise<AppDataComplete> {
    let backupData: AppDataComplete | undefined;

    // we attempt this regardless of the option, because data might be compressed anyway
    if (typeof backupStr === 'string') {
      try {
        backupData = JSON.parse(backupStr) as AppDataComplete;
      } catch (e) {
        try {
          const decompressedData = await this._compressionService.decompressUTF16(backupStr);
          backupData = JSON.parse(decompressedData) as AppDataComplete;
        } catch (e) {
          console.error('Drive Sync, invalid data');
          console.warn(e);
        }
      }
    }
    return backupData || (backupStr as AppDataComplete);
  }

  private _updateConfig(data: Partial<GoogleDriveSyncConfig>): UpdateGlobalConfigSection {
    return new UpdateGlobalConfigSection({
      sectionKey: 'googleDriveSync',
      sectionCfg: data,
    });
  }

  private _getLocalAppData(): Promise<AppDataComplete> {
    return this._dataImportService.getCompleteSyncData();
  }

  // SIMPLE HELPER
  private _isNewerThan(strDate1: string | number, strDate2: string | number): boolean {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() > d2.getTime());
  }

  private _isEqual(strDate1: string | number, strDate2: string | number): boolean {
    const d1 = new Date(strDate1);
    const d2 = new Date(strDate2);
    return (d1.getTime() === d2.getTime());
  }

  private _formatDate(date: Date | string | number) {
    return moment(date).format('DD-MM-YYYY --- hh:mm:ss');
  }

  private _setInitialSyncDone() {
    if (!this.isInitialSyncDone) {
      this._syncService.setInitialSyncDone(true, SyncProvider.GoogleDrive);
      this.isInitialSyncDone = true;
    }
  }

  // wrapper to handle string dates as well
  private saveLastLocalSyncModelChange(date: number | string | Date) {
    const d = (typeof date === 'number')
      ? date
      : new Date(date).getTime();
    this._persistenceService.updateLastLocalSyncModelChange(d);
  }
}
