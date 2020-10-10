import { Injectable } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { concatMap, filter, map, switchMap, tap } from 'rxjs/operators';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { GlobalConfigActionTypes, UpdateGlobalConfigSection } from '../../../../features/config/store/global-config.actions';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { SnackService } from '../../../../core/snack/snack.service';
import { T } from '../../../../t.const';
import { GoogleApiService } from '../google-api.service';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { DEFAULT_SYNC_FILE_NAME } from '../google.const';

@Injectable()
export class GoogleDriveSyncEffects {
  @Effect() createSyncFile$: any = this._actions$.pipe(
    ofType(
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    filter(({payload}: UpdateGlobalConfigSection): boolean => payload.sectionKey === 'sync'),
    switchMap(({payload}: UpdateGlobalConfigSection): Observable<{
      syncFileName: string,
      _backupDocId: string,
      _syncFileNameForBackupDocId: string,
      sync: SyncConfig
    } | never> => {
      const syncConfig = payload.sectionCfg as SyncConfig;
      const isChanged = (syncConfig.googleDriveSync.syncFileName !== syncConfig.googleDriveSync._syncFileNameForBackupDocId);

      if ((isChanged || !syncConfig.googleDriveSync._backupDocId) && syncConfig.googleDriveSync.syncFileName.length > 0) {
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
      syncFileName: string,
      _backupDocId: string,
      _syncFileNameForBackupDocId: string,
      sync: SyncConfig
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

  constructor(
    private _actions$: Actions,
    private _snackService: SnackService,
    private _googleApiService: GoogleApiService,
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
}
