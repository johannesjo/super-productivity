import { Injectable } from '@angular/core';
import { SyncService } from '../../imex/sync/sync.service';
import { ConfigService } from '../config/config.service';
import { GoogleApiService } from './google-api.service';
import { SnackService } from '../../core/snack/snack.service';
import { MatDialog } from '@angular/material';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  ChangeSyncFileName,
  LoadFromGoogleDriveFlow,
  SaveForSync,
  SaveToGoogleDriveFlow
} from './store/google-drive-sync.actions';

@Injectable()
export class GoogleDriveSyncService {

  constructor(
    private _syncService: SyncService,
    private _configService: ConfigService,
    private _googleApiService: GoogleApiService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _store$: Store<any>,
  ) {
  }

  changeSyncFileName(newFileName): void {
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
