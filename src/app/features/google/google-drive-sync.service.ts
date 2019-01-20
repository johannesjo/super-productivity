import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  ChangeSyncFileName,
  LoadFromGoogleDriveFlow,
  SaveForSync,
  SaveToGoogleDriveFlow
} from './store/google-drive-sync.actions';
import {
  selectIsGoogleDriveLoadInProgress,
  selectIsGoogleDriveSaveInProgress
} from './store/google-drive-sync.reducer';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable()
export class GoogleDriveSyncService {
  isLoadInProgress$: Observable<boolean> = this._store$.select(selectIsGoogleDriveLoadInProgress)
    .pipe(distinctUntilChanged());
  isSaveInProgress$: Observable<boolean> = this._store$.select(selectIsGoogleDriveSaveInProgress)
    .pipe(distinctUntilChanged());

  constructor(
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
