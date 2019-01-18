import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { NotifyService } from '../../../core/notify/notify.service';

import { ElectronService } from 'ngx-electron';
import { ConfigActionTypes } from '../../config/store/config.actions';
import { distinctUntilChanged, filter, flatMap, map, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { combineLatest, EMPTY, from, interval, Observable } from 'rxjs';
import { GoogleDriveSyncService } from '../google-drive-sync.service';
import { GoogleApiService } from '../google-api.service';
import { ConfigService } from '../../config/config.service';
import { SnackService } from '../../../core/snack/snack.service';

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


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _googleApiService: GoogleApiService,
    private _configService: ConfigService,
    private _snackService: SnackService,
    private _notifyService: NotifyService,
    private _electronService: ElectronService,
    private _persistenceService: PersistenceService,
  ) {
  }

  private _checkForInitialUpdate(): Observable<any> {
    return this._googleDriveSyncService.checkIfRemoteUpdate()
      .pipe(
        take(1),
        flatMap((isUpdate) => {
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
  }
}


