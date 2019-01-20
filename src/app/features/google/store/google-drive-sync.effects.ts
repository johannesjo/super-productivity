import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { NotifyService } from '../../../core/notify/notify.service';

import { ElectronService } from 'ngx-electron';
import { ConfigActionTypes, UpdateConfigSection } from '../../config/store/config.actions';
import { distinctUntilChanged, filter, flatMap, map, mergeMap, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { combineLatest, EMPTY, from, interval, Observable, of } from 'rxjs';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';
import { SnackService } from '../../../core/snack/snack.service';
import { ChangeSyncFileName, CreateSyncFile, GoogleDriveSyncActionTypes } from './google-drive-sync.actions';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material';
import { GoogleDriveSyncConfig } from '../../config/config.model';
import { SyncService } from '../../../imex/sync/sync.service';
import { SnackOpen } from '../../../core/snack/store/snack.actions';

@Injectable()
export class GoogleDriveSyncEffects {
  config$ = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));

  // TODO check why distinct until changed not working as intended
  isEnabled$ = this.config$.pipe(map(cfg => cfg.isEnabled), distinctUntilChanged());
  isAutoSyncToRemote$ = this.config$.pipe(map(cfg => cfg.isAutoSyncToRemote), distinctUntilChanged());
  syncInterval$ = this.config$.pipe(map(cfg => cfg.syncInterval), distinctUntilChanged());

  @Effect({dispatch: false}) triggerSync$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
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
            ? interval(syncInterval).pipe(switchMap(() => this._googleDriveSyncService.saveForSync()))
            : EMPTY;
        }),
      )),
    );

  // TODO check if working as intended
  @Effect({dispatch: false}) initialImport$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.LoadConfig,
      ),
      take(1),
      withLatestFrom(this.config$),
      filter(([act, cfg]) => cfg.isEnabled && cfg.isAutoLogin),
      switchMap(() => from(this._googleApiService.login())),
      switchMap(() => this._googleDriveSyncService.checkIfRemoteUpdate()),
      switchMap((isUpdate) => {
        console.log('isUpdate', isUpdate);
        if (isUpdate) {
          this._snackService.open({
            message: `DriveSync: There is a remote update! Downloading...`,
            icon: 'file_download',
          });
          console.log('DriveSync', 'HAS CHANGED (modified Date comparision), TRYING TO UPDATE');
          return this._googleDriveSyncService.loadFrom(true);
        } else {
          this._snackService.open({
            message: `DriveSync: No updated required`,
          });
          return EMPTY;
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
            const filesFound = res.body.items;
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
      mergeMap((action: ChangeSyncFileName) => {
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

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _googleApiService: GoogleApiService,
    private _configService: ConfigService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _syncService: SyncService,
    private _notifyService: NotifyService,
    private _electronService: ElectronService,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _updateConfig(data: Partial<GoogleDriveSyncConfig>, isSkipLastActive = false): UpdateConfigSection {
    return new UpdateConfigSection({
      sectionKey: 'googleDriveSync',
      sectionCfg: data,
      isSkipLastActive,
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

}


