import { Injectable } from '@angular/core';
import { EMPTY, from, Observable, of, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  map,
  pairwise,
  shareReplay,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { Actions, Effect, ofType } from '@ngrx/effects';
import {
  GlobalConfigActionTypes,
  UpdateGlobalConfigSection
} from '../../../../features/config/store/global-config.actions';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';
import { GoogleApiService } from '../google-api.service';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { DEFAULT_SYNC_FILE_NAME } from '../google.const';
import { SyncProvider } from '../../sync-provider.model';
import { HANDLED_ERROR_PROP_STR } from '../../../../app.constants';
import { GlobalConfigService } from '../../../../features/config/global-config.service';
import { DataInitService } from '../../../../core/data-init/data-init.service';

// this._globalConfigService.cfg$.pipe(
//   map(syncCfg => syncCfg.sync),
//   tap(console.log),
//   distinctUntilChanged((a: SyncConfig, b: SyncConfig) => {
//     console.log(a.googleDriveSync.authCode, b.googleDriveSync.authCode);
//     return a.googleDriveSync.authCode === b.googleDriveSync.authCode;
//   }),
// ).subscribe((syncCfg: SyncConfig) => {
//   console.log('BEFORE', syncCfg);
//   if (syncCfg.googleDriveSync.authCode) {
//     console.log('I am here!');
//     this._globalConfigService.updateSection('sync', {
//       ...syncCfg,
//       googleDriveSync: {
//         ...syncCfg.googleDriveSync,
//         authCode: null,
//       }
//     });  this._googleApiService.getTokenFromAuthCode(syncCfg.googleDriveSync.authCode).then(console.log);
//   }
// });

@Injectable()
export class GoogleDriveSyncEffects {
  private _isChangedAuthCode$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    // NOTE: it is important that we don't use distinct until changed here
    switchMap(() => this._globalConfigService.cfg$),
    map((cfg) => cfg.sync.googleDriveSync.authCode),
    pairwise(),
    map(([a, b]) => a !== b),
    filter(authCode => !!authCode),
    shareReplay(),
  );

  @Effect() createSyncFile$: any = this._actions$.pipe(
    ofType(
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    filter(({payload}: UpdateGlobalConfigSection): boolean => payload.sectionKey === 'sync'),
    map(({payload}) => payload.sectionCfg as SyncConfig),
    switchMap((syncConfig: SyncConfig): Observable<{
      syncFileName: string;
      _backupDocId: string;
      _syncFileNameForBackupDocId: string;
      sync: SyncConfig;
    } | never> => {
      const isChanged = (syncConfig.googleDriveSync.syncFileName !== syncConfig.googleDriveSync._syncFileNameForBackupDocId);
      if (syncConfig.syncProvider === SyncProvider.GoogleDrive
        && (isChanged || !syncConfig.googleDriveSync._backupDocId)
        && syncConfig.googleDriveSync.syncFileName.length > 0
      ) {
        const newFileName = syncConfig.googleDriveSync.syncFileName || DEFAULT_SYNC_FILE_NAME;
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
                  return !isSave
                    ? EMPTY
                    : this._googleApiService.saveFile$('', {
                      title: newFileName,
                      editable: true
                    });
                }),
                map((res2: any) => ({
                  syncFileName: res2.title,
                  _syncFileNameForBackupDocId: res2.title,
                  _backupDocId: res2.id,
                  sync: syncConfig,
                }))
              );
            } else if (filesFound.length === 1) {
              return this._confirmUsingExistingFileDialog$(newFileName).pipe(
                concatMap((isConfirmUseExisting) => {
                  const fileToUpdate = filesFound[0];
                  return isConfirmUseExisting
                    ? of({
                      syncFileName: newFileName,
                      _syncFileNameForBackupDocId: newFileName,
                      _backupDocId: fileToUpdate.id,
                      sync: syncConfig,
                    })
                    : EMPTY;
                })
              );
            }
            return EMPTY;
          }),
          map((v) => v as any),
          catchError((err: any) => {
            this._snackService.open({
              type: 'ERROR',
              msg: T.F.GOOGLE.S.SYNC_FILE_CREATION_ERROR,
              translateParams: {err: this._getApiErrorString(err)},
            });
            return throwError({[HANDLED_ERROR_PROP_STR]: 'GD File creation: ' + this._getApiErrorString(err)});
          })
        );
      } else {
        return EMPTY;
      }
    }),
    tap((): any => setTimeout(() => this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.GOOGLE.S.UPDATED_SYNC_FILE_NAME
      }), 200)
    ),
    map(({syncFileName, _backupDocId, _syncFileNameForBackupDocId, sync}: {
      syncFileName: string;
      _backupDocId: string;
      _syncFileNameForBackupDocId: string;
      sync: SyncConfig;
    }) => new UpdateGlobalConfigSection({
      sectionKey: 'sync',
      sectionCfg: ({
        ...sync,
        googleDriveSync: {
          ...sync.googleDriveSync,
          _backupDocId,
          _syncFileNameForBackupDocId,
          syncFileName,
        }
      } as SyncConfig)
    })),
  );

  @Effect({dispatch: false}) getAuthTokenFromAccessCode: any = this._actions$.pipe(
    ofType(
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    filter(({payload}: UpdateGlobalConfigSection): boolean => payload.sectionKey === 'sync'),
    map(({payload}) => payload.sectionCfg as SyncConfig),
    filter(syncConfig => syncConfig.syncProvider === SyncProvider.GoogleDrive),
    withLatestFrom(this._isChangedAuthCode$),
    switchMap(([syncConfig, isChanged]: [SyncConfig, boolean]) => {
      if (isChanged && typeof syncConfig.googleDriveSync.authCode === 'string') {
        return from(this._googleApiService.getAndSetTokenFromAuthCode(syncConfig.googleDriveSync.authCode)).pipe(
          // NOTE: catch needs to be limited to request only, otherwise we break the chain
          catchError((e) => {
            console.error(e);
            this._snackService.open({type: 'ERROR', msg: T.F.DROPBOX.S.ACCESS_TOKEN_ERROR});
            // filter
            return EMPTY;
          }),
          // we only need it once so we unset it afterwards
          tap(() => this._globalConfigService.updateSection('sync', {
            ...syncConfig,
            googleDriveSync: {
              ...syncConfig.googleDriveSync,
              authCode: null,
            }
          })),
        );
      } else {
        return EMPTY;
      }
    }),
    tap((): any => setTimeout(() => this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.DROPBOX.S.ACCESS_TOKEN_GENERATED
      }), 200)
    ),
  );

  constructor(
    private _actions$: Actions,
    private _snackService: SnackService,
    private _googleApiService: GoogleApiService,
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
    private _matDialog: MatDialog,
  ) {

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

  private _getApiErrorString(err: any): string {
    if (err?.details) {
      return err.details;
    }
    if (err && err[HANDLED_ERROR_PROP_STR]?.details) {
      return err[HANDLED_ERROR_PROP_STR].details;
    }
    if (err && err[HANDLED_ERROR_PROP_STR]?.message) {
      return err[HANDLED_ERROR_PROP_STR].message;
    }
    if (err?.message) {
      return err.message;
    }
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err && err[HANDLED_ERROR_PROP_STR]) {
      return err[HANDLED_ERROR_PROP_STR];
    }
    return err.toString();
  }
}
