import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { LoadFromGoogleDriveFlow, SaveForSync, SaveToGoogleDriveFlow } from './store/google-drive-sync.actions';
import { concatMap, distinctUntilChanged, filter, first, map, take, tap } from 'rxjs/operators';
import { GlobalConfigService } from '../config/global-config.service';
import { GoogleDriveSyncConfig } from '../config/global-config.model';
import { DataImportService } from '../../imex/sync/data-import.service';
import { SyncService } from '../../imex/sync/sync.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AppDataComplete } from '../../imex/sync/sync.model';

import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from '../../imex/sync/check-for-update.util';
import { DropboxConflictResolution, DropboxFileMetadata } from '../dropbox/dropbox.model';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import {
  LS_GOOGLE_LAST_LOCAL_REVISION,
  LS_GOOGLE_LOCAL_LAST_SYNC,
  LS_GOOGLE_LOCAL_LAST_SYNC_CHECK
} from '../../core/persistence/ls-keys.const';
import { DialogDbxSyncConflictComponent } from '../dropbox/dialog-dbx-sync-conflict/dialog-dbx-sync-conflict.component';
import { SyncProvider, SyncProviderServiceInterface } from '../../imex/sync/sync-provider.model';
import { GoogleApiService } from './google-api.service';

export const gdLog = (...args: any) => console.log(...args);

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.GoogleDrive;

  cfg$: Observable<GoogleDriveSyncConfig> = this._configService.cfg$.pipe(map(cfg => cfg.sync.googleDriveSync));

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._googleApiService.isLoggedIn$),
    distinctUntilChanged(),
  );

  private _isReadyForRequests$: Observable<boolean> = this.isReady$.pipe(
    tap((isReady) => !isReady && new Error('Dropbox Sync not ready')),
    first(),
  );

  constructor(
    private _store$: Store<any>,
    private _configService: GlobalConfigService,
    private _dataImportService: DataImportService,
    private _syncService: SyncService,
    private _googleApiService: GoogleApiService,
    private _dataInitService: DataInitService,
    // private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _translateService: TranslateService,
  ) {

  }

  // TODO remove all
  saveForSync(): void {
    this._store$.dispatch(new SaveForSync());
  }

  saveTo(): void {
    this._store$.dispatch(new SaveToGoogleDriveFlow());
  }

  loadFrom(): void {
    this._store$.dispatch(new LoadFromGoogleDriveFlow());
  }

  // TODO triger via effect
  changeSyncFileName$(newFileName: string): Observable<string> {
    // this._store$.dispatch(new ChangeSyncFileName({newFileName}));
    // TODO get doc id
    return of('TEST');
  }

  async sync(): Promise<unknown> {
    let local: AppDataComplete | undefined;

    await this._isReadyForRequests$.toPromise();
    const lastSync = this._getLocalLastSync();
    const localRev = this._getLocalRev();
    this._updateLocalLastSyncCheck();

    // PRE CHECK 2
    // check if file revision changed
    // ------------------------------
    const {rev, clientUpdate} = await this._getRevAndLastClientUpdate();

    if (rev && rev === localRev) {
      gdLog('DBX PRE1: ↔ Same Rev', rev);
      // NOTE: same rev, doesn't mean. that we can't have local changes
      local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
      if (lastSync === local.lastLocalSyncModelChange) {
        gdLog('DBX PRE1: No local changes to sync');
        return;
      }
    }

    // PRE CHECK 3
    // simple check based on file meta data
    // ------------------------------------
    // if not defined yet
    local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
    if (local.lastLocalSyncModelChange === 0) {
      console.log(local);
      if (!(this._c(T.F.SYNC.C.EMPTY_SYNC))) {
        return;
      }
    }

    // NOTE: missing milliseconds :(
    const remoteClientUpdate = clientUpdate / 1000;
    // NOTE: not 100% an exact science, but changes occurring at the same time
    // getting lost, might be unlikely and ok after all
    // local > remote && lastSync >= remote &&  lastSync < local
    if (
      Math.floor(local.lastLocalSyncModelChange / 1000) > remoteClientUpdate
      && remoteClientUpdate === Math.floor(lastSync / 1000)
      && lastSync < local.lastLocalSyncModelChange
    ) {
      gdLog('GD PRE2: ↑ Update Remote');
      return await this._uploadAppData(local);
    }

    // COMPLEX SYNC HANDLING
    // ---------------------
    const r = (await this._downloadAppData());
    const remote = r.data;
    const timestamps = {
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange
    };

    switch (checkForUpdate(timestamps)) {
      case UpdateCheckResult.InSync: {
        gdLog('GD: ↔ In Sync => No Update');
        return;
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        gdLog('GD: ↓ Update Local');
        return await this._importData(remote, r.meta.rev);
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        gdLog('GD: ↑ Update Remote');
        return await this._uploadAppData(local);
      }

      case UpdateCheckResult.RemoteNotUpToDateDespiteSync: {
        gdLog('GD: X Remote not up to date despite sync');
        if (this._c(T.F.SYNC.C.TRY_LOAD_REMOTE_AGAIN)) {
          return this.sync();
        } else {
          return this._handleConflict({remote, local, lastSync, downloadMeta: r.meta});
        }
      }

      case UpdateCheckResult.DataDiverged: {
        gdLog('^--------^-------^');
        gdLog('GD: ⇎ X Diverged Data');
        return this._handleConflict({remote, local, lastSync, downloadMeta: r.meta});
      }

      case UpdateCheckResult.LastSyncNotUpToDate: {
        gdLog('GD: X Last Sync not up to date');
        this._setLocalLastSync(local.lastLocalSyncModelChange);
        return;
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        gdLog('GD: XXX Wrong Data');
        if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
          if (this._c(T.F.SYNC.C.FORCE_UPLOAD)) {
            return await this._uploadAppData(local, true);
          }
        } else {
          if (this._c(T.F.SYNC.C.FORCE_IMPORT)) {
            return await this._importData(remote, r.meta.rev);
          }
        }
        return;
      }
    }
  }

  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  private async _getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number }> {
    const cfg = await this.cfg$.pipe(first()).toPromise();
    const fileId = cfg._backupDocId;
    const r: any = await this._googleApiService.getFileInfo$(fileId).pipe(first()).toPromise();
    console.log(r);
    const d = new Date(r.client_modified);
    return {
      clientUpdate: d.getTime(),
      rev: r.rev,
    };
  }

  private async _importData(data: AppDataComplete, rev: string) {
    if (!data) {
      const r = (await this._downloadAppData());
      data = r.data;
      rev = r.meta.rev;
    }
    if (!rev) {
      throw new Error('No rev given');
    }

    await this._dataImportService.importCompleteSyncData(data);
    this._setLocalRev(rev);
    this._setLocalLastSync(data.lastLocalSyncModelChange);
    gdLog('GD: ↓ Imported Data ↓ ✓');
  }

  private async _downloadAppData(): Promise<{ meta: DropboxFileMetadata, data: AppDataComplete }> {
    const cfg = await this.cfg$.pipe(first()).toPromise();
    return this._googleApiService.loadFile$(cfg._backupDocId).toPromise();
  }

  private async _uploadAppData(data: AppDataComplete, isForceOverwrite: boolean = false): Promise<DropboxFileMetadata | undefined> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    // try {
    //   const r = await this._dropboxApiService.upload({
    //     path: GOOGLE_SYNC_FILE_PATH,
    //     data,
    //     clientModified: data.lastLocalSyncModelChange,
    //     localRev: this._getLocalRev(),
    //     isForceOverwrite
    //   });
    //   this._setLocalRev(r.rev);
    //   this._setLocalLastSync(data.lastLocalSyncModelChange);
    //   gdLog('GD: ↑ Uploaded Data ↑ ✓');
    //   return r;
    // } catch (e) {
    //   console.error(e);
    //   gdLog('GD: X Upload Request Error');
    //   if (this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
    //     return this._uploadAppData(data, true);
    //   }
    // }
    return;
  }

  // LS HELPER
  // ---------
  private _getLocalRev(): string | null {
    return localStorage.getItem(LS_GOOGLE_LAST_LOCAL_REVISION);
  }

  private _setLocalRev(rev: string) {
    if (!rev) {
      throw new Error('No rev given');
    }

    return localStorage.setItem(LS_GOOGLE_LAST_LOCAL_REVISION, rev);
  }

  private _getLocalLastSync(): number {
    const it = +(localStorage.getItem(LS_GOOGLE_LOCAL_LAST_SYNC) as any);
    return isNaN(it)
      ? 0
      : it || 0;
  }

  private _setLocalLastSync(localLastSync: number) {
    if (typeof (localLastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given');
    }
    return localStorage.setItem(LS_GOOGLE_LOCAL_LAST_SYNC, localLastSync.toString());
  }

  private _updateLocalLastSyncCheck() {
    localStorage.setItem(LS_GOOGLE_LOCAL_LAST_SYNC_CHECK, Date.now().toString());
  }

  private async _handleConflict({remote, local, lastSync, downloadMeta}: {
    remote: AppDataComplete;
    local: AppDataComplete;
    lastSync: number;
    downloadMeta: DropboxFileMetadata;
  }) {
    const dr = await this._openConflictDialog$({
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange
    }).toPromise();

    if (dr === 'USE_LOCAL') {
      gdLog('GD: Dialog => ↑ Remote Update');
      return await this._uploadAppData(local, true);
    } else if (dr === 'USE_REMOTE') {
      gdLog('GD: Dialog => ↓ Update Local');
      return await this._importData(remote, downloadMeta.rev);
    }
    return;
  }

  private _openConflictDialog$({remote, local, lastSync}: {
    remote: number;
    local: number;
    lastSync: number
  }): Observable<DropboxConflictResolution> {
    return this._matDialog.open(DialogDbxSyncConflictComponent, {
      restoreFocus: true,
      data: {
        remote,
        local,
        lastSync,
      }
    }).afterClosed();
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  };
}
