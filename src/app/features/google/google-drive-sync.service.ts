import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  ChangeSyncFileName,
  GoogleDriveSyncActionTypes,
  LoadFromGoogleDriveFlow,
  SaveForSync,
  SaveToGoogleDriveFlow
} from './store/google-drive-sync.actions';
import {
  selectIsGoogleDriveLoadInProgress,
  selectIsGoogleDriveSaveInProgress
} from './store/google-drive-sync.reducer';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { GlobalConfigService } from '../config/global-config.service';
import { Actions, ofType } from '@ngrx/effects';
import { GoogleDriveSyncConfig } from '../config/global-config.model';

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService {
  isLoadInProgress$: Observable<boolean> = this._store$.select(selectIsGoogleDriveLoadInProgress)
    .pipe(distinctUntilChanged());
  isSaveInProgress$: Observable<boolean> = this._store$.select(selectIsGoogleDriveSaveInProgress)
    .pipe(distinctUntilChanged());

  cfg$: Observable<GoogleDriveSyncConfig> = this._configService.cfg$.pipe(map(cfg => cfg.googleDriveSync));

  onSaveEnd$: Observable<any> = this._actions$.pipe(ofType(
    GoogleDriveSyncActionTypes.SaveToGoogleDriveSuccess,
    GoogleDriveSyncActionTypes.SaveToGoogleDriveCancel,
  ));

  // TODO think of something
  // isInSync$: Observable<boolean|'UNKNOWN'> = this._configService.cfg$.pipe(
  //   map(cfg => cfg.googleDriveSync),
  //   tap(cfg => (console.log(new Date(cfg._lastSync), this._syncService.getLastLocalSyncModelChange()))),
  //   map(cfg => (new Date(cfg._lastSync) === this._syncService.getLastLocalSyncModelChange())),
  // );

  constructor(
    private _store$: Store<any>,
    private _configService: GlobalConfigService,
    private _actions$: Actions,
  ) {
  }

  changeSyncFileName(newFileName: string): void {
    this._store$.dispatch(new ChangeSyncFileName({newFileName}));
  }

  saveForSync(): void {
    this._store$.dispatch(new SaveForSync());
  }

  saveTo(): void {
    this._store$.dispatch(new SaveToGoogleDriveFlow());
  }

  loadFrom(): void {
    this._store$.dispatch(new LoadFromGoogleDriveFlow());
  }
}
