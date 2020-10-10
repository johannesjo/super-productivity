import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map, take, tap } from 'rxjs/operators';
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
import { DropboxConflictResolution } from '../dropbox/dropbox.model';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import {
  LS_GOOGLE_LAST_LOCAL_REVISION,
  LS_GOOGLE_LOCAL_LAST_SYNC,
  LS_GOOGLE_LOCAL_LAST_SYNC_CHECK
} from '../../core/persistence/ls-keys.const';
import { DialogDbxSyncConflictComponent } from '../dropbox/dialog-dbx-sync-conflict/dialog-dbx-sync-conflict.component';
import { SyncProvider, SyncProviderServiceInterface } from '../../imex/sync/sync-provider.model';
import { GoogleApiService } from './google-api.service';
import { GoogleDriveFileMeta } from './google-api.model';
import { CompressionService } from '../../core/compression/compression.service';

export const gdLog = (...args: any) => console.log(...args);

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.GoogleDrive;

  cfg$: Observable<GoogleDriveSyncConfig> = this._configService.cfg$.pipe(map(cfg => cfg.sync.googleDriveSync));

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._googleApiService.isLoggedIn$),
    concatMap(() => this.cfg$.pipe(
      map(cfg => cfg.syncFileName === cfg._syncFileNameForBackupDocId && !!cfg._backupDocId)),
    ),
    distinctUntilChanged(),
  );

  private _isReadyForRequests$: Observable<boolean> = this.isReady$.pipe(
    tap((isReady) => !isReady && new Error('Google Drive Sync not ready')),
    first(),
  );

  constructor(
    private _configService: GlobalConfigService,
    private _dataImportService: DataImportService,
    private _syncService: SyncService,
    private _googleApiService: GoogleApiService,
    private _dataInitService: DataInitService,
    // private _snackService: SnackService,
    private _compressionService: CompressionService,
    private _matDialog: MatDialog,
    private _translateService: TranslateService,
  ) {
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

    // PRE CHECK 4
    const remote = r.data;
    // TODO sync fix check for valid data
    if (!remote || !remote.lastLocalSyncModelChange) {
      console.log(r, remote);
      // TODO sync fix i18n
      if (confirm('No remote data found. Upload local to Remote?')) {
        gdLog('GD: ↑ Update Remote');
        return await this._uploadAppData(local);
      }
      return;
    }

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
        return await this._importData(remote, r.meta.md5Checksum as string); // r.meta.rev
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
            return await this._importData(remote, r.meta.md5Checksum as string);
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
    const d = new Date(r.client_modified);
    return {
      clientUpdate: d.getTime(),
      rev: r.md5Checksum,
    };
  }

  private async _importData(data: AppDataComplete, rev: string) {
    if (!data) {
      const r = (await this._downloadAppData());
      data = r.data as AppDataComplete;
      rev = r.meta.md5Checksum as string;
    }
    if (!rev) {
      throw new Error('No rev given');
    }

    await this._dataImportService.importCompleteSyncData(data);
    this._setLocalRev(rev);
    this._setLocalLastSync(data.lastLocalSyncModelChange);
    gdLog('GD: ↓ Imported Data ↓ ✓');
  }

  private async _downloadAppData(): Promise<{ meta: GoogleDriveFileMeta, data: AppDataComplete | undefined }> {
    const cfg = await this.cfg$.pipe(first()).toPromise();
    const {backup, meta} = await this._googleApiService.loadFile$(cfg._backupDocId).pipe(first()).toPromise();
    console.log(backup, meta);

    const data = !!backup
      ? await this._decodeAppDataIfNeeded(backup)
      : undefined;
    return {meta, data};
  }

  private async _uploadAppData(data: AppDataComplete, isForceOverwrite: boolean = false): Promise<unknown> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    try {
      const cfg = await this.cfg$.pipe(first()).toPromise();
      console.log(cfg, data);

      const uploadData = cfg.isCompressData
        ? await this._compressionService.compressUTF16(JSON.stringify(data))
        : JSON.stringify(data);
      const r: any = await this._googleApiService.saveFile$(uploadData, {
        title: cfg.syncFileName,
        id: cfg._backupDocId,
        editable: true,
        mimeType: cfg.isCompressData ? 'text/plain' : 'application/json',
      }).toPromise();
      if (!r.md5Checksum) {
        throw new Error('N md5Checksum');
      }

      this._setLocalRev(r.md5Checksum);
      this._setLocalLastSync(data.lastLocalSyncModelChange);
      gdLog('GD: ↑ Uploaded Data ↑ ✓');
      return r;
    } catch (e) {
      console.error(e);
      gdLog('GD: X Upload Request Error');
      if (this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
        return this._uploadAppData(data, true);
      }
    }
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

  // TODO sync fix use with drobox
  private async _handleConflict({remote, local, lastSync, downloadMeta}: {
    remote: AppDataComplete;
    local: AppDataComplete;
    lastSync: number;
    downloadMeta: GoogleDriveFileMeta;
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
      return await this._importData(remote, downloadMeta.md5Checksum as string);
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
}
