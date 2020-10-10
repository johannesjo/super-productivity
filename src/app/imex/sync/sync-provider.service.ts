import { Injectable } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { DropboxSyncService } from '../../features/dropbox/dropbox-sync.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import { GoogleDriveSyncService } from '../../features/google/google-drive-sync.service';
import { AppDataComplete } from './sync.model';
import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';
import { DropboxConflictResolution } from '../../features/dropbox/dropbox.model';
import { DialogDbxSyncConflictComponent } from '../../features/dropbox/dialog-dbx-sync-conflict/dialog-dbx-sync-conflict.component';
import { TranslateService } from '@ngx-translate/core';
import { SyncService } from './sync.service';
import { MatDialog } from '@angular/material/dialog';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(map(cfg => cfg?.sync));
  currentProvider$: Observable<SyncProviderServiceInterface> = this.syncCfg$.pipe(
    map((cfg: SyncConfig): SyncProviderServiceInterface | null => {
      console.log(cfg.syncProvider);
      switch (cfg.syncProvider) {
        case SyncProvider.Dropbox:
          return this._dropboxSyncService;
        case SyncProvider.GoogleDrive:
          return this._googleDriveSyncService;
        default:
          return null;
      }
    }),
    filter(p => !!p),
    map((v) => v as SyncProviderServiceInterface),
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
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _globalConfigService: GlobalConfigService,
    private _translateService: TranslateService,
    private _syncService: SyncService,
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
    const lastSync = cp.getLocalLastSync();
    const localRev = cp.getLocalRev();
    cp.updateLocalLastSyncCheck();

    // PRE CHECK 2
    // check if file revision changed
    // ------------------------------
    const {rev, clientUpdate} = await cp.getRevAndLastClientUpdate();

    if (rev && rev === localRev) {
      cp.log('DBX PRE1: ↔ Same Rev', rev);
      // NOTE: same rev, doesn't mean. that we can't have local changes
      local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
      if (lastSync === local.lastLocalSyncModelChange) {
        cp.log('DBX PRE1: No local changes to sync');
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
      cp.log('GD PRE2: ↑ Update Remote');
      return await cp.uploadAppData(local);
    }

    // COMPLEX SYNC HANDLING
    // ---------------------
    const r = (await cp.downloadAppData());

    // PRE CHECK 4
    const remote = r.data;
    if (!remote || !remote.lastLocalSyncModelChange) {
      if (this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        cp.log('↑ Update Remote');
        return await cp.uploadAppData(local);
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
        cp.log('↔ In Sync => No Update');
        return;
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        cp.log('↓ Update Local');
        return await cp.importAppData(remote, r.rev as string); // r.meta.rev
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        cp.log('↑ Update Remote');
        return await cp.uploadAppData(local);
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
        cp.setLocalLastSync(local.lastLocalSyncModelChange);
        return;
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        cp.log('XXX Wrong Data');
        if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
          if (this._c(T.F.SYNC.C.FORCE_UPLOAD)) {
            return await cp.uploadAppData(local, true);
          }
        } else {
          if (this._c(T.F.SYNC.C.FORCE_IMPORT)) {
            return await cp.importAppData(remote, r.rev as string);
          }
        }
        return;
      }
    }
  }

  // TODO sync fix use with drobox
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
      return await cp.uploadAppData(local, true);
    } else if (dr === 'USE_REMOTE') {
      cp.log('Dialog => ↓ Update Local');
      return await cp.importAppData(remote, rev);
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
