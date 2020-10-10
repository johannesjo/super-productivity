import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { DropboxSyncService } from './dropbox/dropbox-sync.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { distinctUntilChanged, filter, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import { GoogleDriveSyncService } from './google/google-drive-sync.service';
import { AppDataComplete, DialogConflictResolutionResult } from './sync.model';
import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { TranslateService } from '@ngx-translate/core';
import { SyncService } from './sync.service';
import { MatDialog } from '@angular/material/dialog';
import {
  LS_SYNC_LAST_LOCAL_REVISION,
  LS_SYNC_LOCAL_LAST_SYNC,
  LS_SYNC_LOCAL_LAST_SYNC_CHECK
} from '../../core/persistence/ls-keys.const';
import { DataImportService } from './data-import.service';
import { WebDavSyncService } from './web-dav/web-dav-sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { isValidAppData } from './is-valid-app-data.util';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(map(cfg => cfg?.sync));
  currentProvider$: Observable<SyncProviderServiceInterface> = this.syncCfg$.pipe(
    map((cfg: SyncConfig): SyncProvider | null => cfg.syncProvider),
    distinctUntilChanged(),
    map((syncProvider: SyncProvider | null): SyncProviderServiceInterface | null => {
      console.log(syncProvider);
      switch (syncProvider) {
        case SyncProvider.Dropbox:
          return this._dropboxSyncService;
        case SyncProvider.GoogleDrive:
          return this._googleDriveSyncService;
        case SyncProvider.WebDAV:
          return this._webDavSyncService;
        default:
          return null;
      }
    }),
    filter(p => !!p),
    map((v) => v as SyncProviderServiceInterface),
    shareReplay(1),
  );
  syncInterval$: Observable<number> = this.syncCfg$.pipe(map(cfg => cfg.syncInterval));
  isEnabled$: Observable<boolean> = this.syncCfg$.pipe(map(cfg => cfg.isEnabled));
  isEnabledAndReady$: Observable<boolean> = combineLatest([
    this.currentProvider$.pipe(
      switchMap(currentProvider => currentProvider.isReady$),
    ),
    this.syncCfg$.pipe(map(cfg => cfg.isEnabled)),
  ]).pipe(
    map(([isReady, isEnabled]) => isReady && isEnabled),
  );

  constructor(
    private _dropboxSyncService: DropboxSyncService,
    private _dataImportService: DataImportService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _webDavSyncService: WebDavSyncService,
    private _globalConfigService: GlobalConfigService,
    private _translateService: TranslateService,
    private _syncService: SyncService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
  ) {
  }

  async sync(): Promise<unknown> {
    const currentProvider = await this.currentProvider$.pipe(take(1)).toPromise();
    if (!currentProvider) {
      throw new Error('No Sync Provider for sync()');
    }
    return this._sync(currentProvider);
  }

  private async _sync(cp: SyncProviderServiceInterface): Promise<unknown> {
    let local: AppDataComplete | undefined;

    await cp.isReadyForRequests$.toPromise();
    const lastSync = this._getLocalLastSync(cp);
    const localRev = this._getLocalRev(cp);
    this._updateLocalLastSyncCheck(cp);

    // PRE CHECK 1
    // check if remote data & file revision changed
    // --------------------------------------------
    const revRes = await cp.getRevAndLastClientUpdate(localRev);
    if (typeof revRes === 'string') {
      if (revRes === 'AUTH_ERROR') {
        return;
      } else if (revRes === 'NO_REMOTE_DATA' && this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        cp.log('↑ Update Remote after no getRevAndLastClientUpdate()');
        local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
        return await this._uploadAppData(cp, local);
      } else {
        this._snackService.open({
          msg: T.F.SYNC.S.UNKNOWN_ERROR,
          type: 'ERROR'
        });
        return;
      }
    }
    const {rev, clientUpdate} = revRes as { rev: string; clientUpdate: number };

    if (rev && rev === localRev) {
      cp.log('PRE1: ↔ Same Rev', rev);
      // NOTE: same rev, doesn't mean. that we can't have local changes
      local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
      if (lastSync === local.lastLocalSyncModelChange) {
        cp.log('PRE1: No local changes to sync');
        return;
      }
    }

    // PRE CHECK 2
    // simple check based on local meta
    // ------------------------------------
    // if not defined yet
    local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
    if (local.lastLocalSyncModelChange === 0) {
      if (!(this._c(T.F.SYNC.C.EMPTY_SYNC))) {
        cp.log('PRE2: Abort');
        return;
      }
    }

    // PRE CHECK 3
    // simple check based on file meta data
    // ------------------------------------
    // NOTE: missing milliseconds for dropbox :(
    const remoteClientUpdate = clientUpdate / 1000;
    // NOTE: not 100% an exact science, but changes occurring at the same time
    // getting lost, might be unlikely and ok after all
    // local > remote && lastSync >= remote &&  lastSync < local
    if (
      Math.floor(local.lastLocalSyncModelChange / 1000) > remoteClientUpdate
      && remoteClientUpdate === Math.floor(lastSync / 1000)
      && lastSync < local.lastLocalSyncModelChange
    ) {
      cp.log('PRE3: ↑ Update Remote');
      return await this._uploadAppData(cp, local);
    }

    // DOWNLOAD OF REMOTE
    const r = (await this._downloadAppData(cp));

    // PRE CHECK 4
    // check if there is no data or no valid remote data
    // -------------------------------------------------
    const remote = r.data;
    if (!remote || !remote.lastLocalSyncModelChange) {
      if (this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        cp.log('↑ PRE4: Update Remote');
        return await this._uploadAppData(cp, local);
      }
      return;
    }

    // COMPLEX SYNC HANDLING
    // ---------------------
    const timestamps = {
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange
    };

    switch (checkForUpdate(timestamps)) {
      case UpdateCheckResult.InSync: {
        cp.log('↔ In Sync => No Update');
        return;
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        cp.log('↓ Update Local');
        return await this._importAppData(cp, remote, r.rev as string);
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        cp.log('↑ Update Remote');
        return await this._uploadAppData(cp, local);
      }

      case UpdateCheckResult.RemoteNotUpToDateDespiteSync: {
        cp.log('X Remote not up to date despite sync');
        if (this._c(T.F.SYNC.C.TRY_LOAD_REMOTE_AGAIN)) {
          return this.sync();
        } else {
          return this._handleConflict(cp, {remote, local, lastSync, rev: r.rev});
        }
      }

      case UpdateCheckResult.DataDiverged: {
        cp.log('^--------^-------^');
        cp.log('⇎ X Diverged Data');
        return this._handleConflict(cp, {remote, local, lastSync, rev: r.rev});
      }

      case UpdateCheckResult.LastSyncNotUpToDate: {
        cp.log('X Last Sync not up to date');
        this._setLocalLastSync(cp, local.lastLocalSyncModelChange);
        return;
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        cp.log('XXX Wrong Data');
        if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
          if (this._c(T.F.SYNC.C.FORCE_UPLOAD)) {
            return await this._uploadAppData(cp, local, true);
          }
        } else {
          if (this._c(T.F.SYNC.C.FORCE_IMPORT)) {
            return await this._importAppData(cp, remote, r.rev as string);
          }
        }
        return;
      }
    }
  }

  // WRAPPER
  // -------
  private _downloadAppData(cp: SyncProviderServiceInterface): Promise<{ rev: string, data: AppDataComplete | undefined }> {
    const rev = this._getLocalRev(cp);
    return cp.downloadAppData(rev);
  }

  private async _uploadAppData(cp: SyncProviderServiceInterface, data: AppDataComplete, isForceOverwrite: boolean = false): Promise<void> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    const localRev = this._getLocalRev(cp);
    const successRev = await cp.uploadAppData(data, localRev, isForceOverwrite);
    if (typeof successRev === 'string') {
      this._setLocalRev(cp, successRev);
      this._setLocalLastSync(cp, data.lastLocalSyncModelChange);
    }
  }

  private async _importAppData(cp: SyncProviderServiceInterface, data: AppDataComplete, rev: string): Promise<void> {
    if (!data) {
      const r = (await this._downloadAppData(cp));
      data = r.data as AppDataComplete;
      rev = r.rev;
    }
    if (!rev) {
      throw new Error('No rev given');
    }

    await this._dataImportService.importCompleteSyncData(data);
    this._setLocalRev(cp, rev);
    this._setLocalLastSync(cp, data.lastLocalSyncModelChange);
  }

  // LS HELPER
  // ---------
  private _getLocalRev(cp: SyncProviderServiceInterface): string | null {
    return localStorage.getItem(LS_SYNC_LAST_LOCAL_REVISION + cp.id);
  }

  private _setLocalRev(cp: SyncProviderServiceInterface, rev: string) {
    if (!rev) {
      throw new Error('No rev given');
    }

    return localStorage.setItem(LS_SYNC_LAST_LOCAL_REVISION + cp.id, rev);
  }

  private _getLocalLastSync(cp: SyncProviderServiceInterface): number {
    const it = +(localStorage.getItem(LS_SYNC_LOCAL_LAST_SYNC + cp.id) as any);
    return isNaN(it)
      ? 0
      : it || 0;
  }

  private _setLocalLastSync(cp: SyncProviderServiceInterface, localLastSync: number) {
    if (typeof (localLastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given');
    }
    return localStorage.setItem(LS_SYNC_LOCAL_LAST_SYNC + cp.id, localLastSync.toString());
  }

  private _updateLocalLastSyncCheck(cp: SyncProviderServiceInterface) {
    localStorage.setItem(LS_SYNC_LOCAL_LAST_SYNC_CHECK + cp.id, Date.now().toString());
  }

  // OTHER
  // -----
  private async _handleConflict(cp: SyncProviderServiceInterface, {remote, local, lastSync, rev}: {
    remote: AppDataComplete;
    local: AppDataComplete;
    lastSync: number;
    rev: string;
  }) {
    const dr = await this._openConflictDialog$({
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange
    }).toPromise();

    if (dr === 'USE_LOCAL') {
      cp.log('Dialog => ↑ Remote Update');
      const localRev = this._getLocalRev(cp);
      return await cp.uploadAppData(local, localRev, true);
    } else if (dr === 'USE_REMOTE') {
      cp.log('Dialog => ↓ Update Local');
      return await this._importAppData(cp, remote, rev);
    }
    return;
  }

  private _openConflictDialog$({remote, local, lastSync}: {
    remote: number;
    local: number;
    lastSync: number
  }): Observable<DialogConflictResolutionResult> {
    return this._matDialog.open(DialogSyncConflictComponent, {
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
  }
}
