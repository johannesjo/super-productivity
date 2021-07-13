import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of, throwError } from 'rxjs';
import { DropboxSyncService } from './dropbox/dropbox-sync.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  timeout,
} from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import { GoogleDriveSyncService } from './google/google-drive-sync.service';
import { AppDataComplete, DialogConflictResolutionResult } from './sync.model';
import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { TranslateService } from '@ngx-translate/core';
import { SyncTriggerService } from './sync-trigger.service';
import { MatDialog } from '@angular/material/dialog';
import { DataImportService } from './data-import.service';
import { WebDavSyncService } from './web-dav/web-dav-sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { isValidAppData } from './is-valid-app-data.util';
import { truncate } from '../../util/truncate';
import { PersistenceLocalService } from '../../core/persistence/persistence-local.service';
import { getSyncErrorStr } from './get-sync-error-str';
import { PersistenceService } from '../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  syncCfg$: Observable<SyncConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync),
  );
  currentProvider$: Observable<SyncProviderServiceInterface> = this.syncCfg$.pipe(
    map((cfg: SyncConfig): SyncProvider | null => cfg.syncProvider),
    distinctUntilChanged(),
    map((syncProvider: SyncProvider | null): SyncProviderServiceInterface | null => {
      // console.log('Activated SyncProvider:', syncProvider);
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
    filter((p) => !!p),
    map((v) => v as SyncProviderServiceInterface),
    shareReplay(1),
  );
  syncInterval$: Observable<number> = this.syncCfg$.pipe(map((cfg) => cfg.syncInterval));
  isEnabled$: Observable<boolean> = this.syncCfg$.pipe(map((cfg) => cfg.isEnabled));
  isEnabledAndReady$: Observable<boolean> = combineLatest([
    this.currentProvider$.pipe(switchMap((currentProvider) => currentProvider.isReady$)),
    this.syncCfg$.pipe(map((cfg) => cfg.isEnabled)),
  ]).pipe(map(([isReady, isEnabled]) => isReady && isEnabled));
  isSyncing$ = new BehaviorSubject<boolean>(false);

  _afterCurrentSyncDoneIfAny$: Observable<unknown> = this.isSyncing$.pipe(
    filter((isSyncing) => !isSyncing),
  );

  afterCurrentSyncDoneOrSyncDisabled$: Observable<unknown> = this.isEnabled$.pipe(
    switchMap((isEnabled) =>
      isEnabled ? this._afterCurrentSyncDoneIfAny$ : of(undefined),
    ),
  );

  private _inMemoryComplete$: Observable<AppDataComplete> =
    this._persistenceService.inMemoryComplete$.pipe(
      timeout(5000),
      catchError(() => throwError('Error while trying to get inMemoryComplete$')),
    );

  constructor(
    private _dropboxSyncService: DropboxSyncService,
    private _dataImportService: DataImportService,
    private _googleDriveSyncService: GoogleDriveSyncService,
    private _webDavSyncService: WebDavSyncService,
    private _globalConfigService: GlobalConfigService,
    private _persistenceLocalService: PersistenceLocalService,
    private _translateService: TranslateService,
    private _syncTriggerService: SyncTriggerService,
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
  ) {}

  async sync(): Promise<unknown> {
    const currentProvider = await this.currentProvider$.pipe(take(1)).toPromise();
    if (!currentProvider) {
      throw new Error('No Sync Provider for sync()');
    }
    this.isSyncing$.next(true);
    try {
      const r = await this._sync(currentProvider);
      this.isSyncing$.next(false);
      return r;
    } catch (e) {
      console.log('__error during sync__');
      console.error(e);
      this.isSyncing$.next(false);
    }
    return undefined;
  }

  private async _sync(cp: SyncProviderServiceInterface): Promise<unknown> {
    let local: AppDataComplete | undefined;

    const isReady = await cp.isReady$.pipe(first()).toPromise();
    if (!isReady) {
      this._snackService.open({
        msg: T.F.SYNC.S.INCOMPLETE_CFG,
        type: 'ERROR',
      });
      return;
    }

    const localSyncMeta = await this._persistenceLocalService.load();
    const lastSync = localSyncMeta[cp.id].lastSync;
    const localRev = localSyncMeta[cp.id].rev;

    // PRE CHECK 1
    // check if remote data & file revision changed
    // --------------------------------------------
    const revRes = await cp.getRevAndLastClientUpdate(localRev);
    if (typeof revRes === 'string') {
      if (revRes === 'NO_REMOTE_DATA' && this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        this._log(cp, '↑ Update Remote after no getRevAndLastClientUpdate()');
        const localLocal = await this._inMemoryComplete$.pipe(take(1)).toPromise();
        return await this._uploadAppData(cp, localLocal);
      }
      // NOTE: includes HANDLED_ERROR
      return;
    } else if (revRes instanceof Error) {
      this._snackService.open({
        msg: T.F.SYNC.S.UNKNOWN_ERROR,
        translateParams: {
          err: getSyncErrorStr(revRes),
        },
        type: 'ERROR',
      });
    }

    const { rev, clientUpdate } = revRes as { rev: string; clientUpdate: number };

    if (rev && rev === localRev) {
      this._log(cp, 'PRE1: ↔ Same Rev', rev);
      // NOTE: same rev, doesn't mean. that we can't have local changes
      local = await this._inMemoryComplete$.pipe(take(1)).toPromise();
      if (lastSync === local.lastLocalSyncModelChange) {
        this._log(cp, 'PRE1: No local changes to sync');
        return;
      }
    }

    // PRE CHECK 2
    // simple check based on local meta
    // simple check if lastLocalSyncModelChange
    // ------------------------------------
    local = local || (await this._inMemoryComplete$.pipe(take(1)).toPromise());
    // NOTE: should never be the case, but we need to make sure it is
    if (typeof local.lastLocalSyncModelChange !== 'number') {
      console.log(local);
      alert('Error during sync: No lastLocalSyncModelChange');
      throw new Error('Sync failed: No lastLocalSyncModelChange');
    } else if (local.lastLocalSyncModelChange === 0) {
      if (!this._c(T.F.SYNC.C.EMPTY_SYNC)) {
        this._log(cp, 'PRE2: Abort');
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
      Math.floor(local.lastLocalSyncModelChange / 1000) > remoteClientUpdate &&
      remoteClientUpdate === Math.floor(lastSync / 1000) &&
      lastSync < local.lastLocalSyncModelChange
    ) {
      this._log(cp, 'PRE3: ↑ Update Remote');
      return await this._uploadAppData(cp, local);
    }

    // DOWNLOAD OF REMOTE
    const r = await this._downloadAppData(cp);

    // PRE CHECK 4
    // check if there is no data or no valid remote data
    // -------------------------------------------------
    const remote = r.data;
    if (
      !remote ||
      typeof remote.lastLocalSyncModelChange !== 'number' ||
      !remote.lastLocalSyncModelChange
    ) {
      if (this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        this._log(cp, '↑ PRE4: Update Remote');
        return await this._uploadAppData(cp, local);
      }
      return;
    }

    // COMPLEX SYNC HANDLING
    // ---------------------
    const timestamps = {
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange,
    };

    switch (checkForUpdate(timestamps)) {
      case UpdateCheckResult.InSync: {
        this._log(cp, '↔ In Sync => No Update');
        return;
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        this._log(cp, '↓ Update Local');
        return await this._importAppData(cp, remote, r.rev as string);
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        this._log(cp, '↑ Update Remote');
        return await this._uploadAppData(cp, local);
      }

      case UpdateCheckResult.RemoteNotUpToDateDespiteSync: {
        this._log(cp, 'X Remote not up to date despite sync');
        if (this._c(T.F.SYNC.C.TRY_LOAD_REMOTE_AGAIN)) {
          return this.sync();
        } else {
          return this._handleConflict(cp, { remote, local, lastSync, rev: r.rev });
        }
      }

      case UpdateCheckResult.DataDiverged: {
        this._log(cp, '^--------^-------^');
        this._log(cp, '⇎ X Diverged Data');
        return this._handleConflict(cp, { remote, local, lastSync, rev: r.rev });
      }

      case UpdateCheckResult.LastSyncNotUpToDate: {
        this._log(cp, 'X Last Sync not up to date');
        return this._setLocalRevAndLastSync(cp, r.rev, local.lastLocalSyncModelChange);
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        this._log(cp, 'XXX Wrong Data');
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
  private async _downloadAppData(
    cp: SyncProviderServiceInterface,
  ): Promise<{ rev: string; data: AppDataComplete | undefined }> {
    const rev = await this._getLocalRev(cp);
    return cp.downloadAppData(rev);
  }

  private async _uploadAppData(
    cp: SyncProviderServiceInterface,
    data: AppDataComplete,
    isForceOverwrite: boolean = false,
  ): Promise<void> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }
    if (typeof data.lastLocalSyncModelChange !== 'number') {
      console.log(data);
      alert('Error: lastLocalSyncModelChange is not defined');
      throw new Error('lastLocalSyncModelChange is not defined');
    }

    const localRev = await this._getLocalRev(cp);
    const successRev = await cp.uploadAppData(data, localRev, isForceOverwrite);
    if (typeof successRev === 'string') {
      this._log(cp, '↑ Uploaded Data ↑ ✓');
      return (await this._setLocalRevAndLastSync(
        cp,
        successRev,
        data.lastLocalSyncModelChange,
      )) as Promise<void>;
    } else {
      this._log(cp, 'X Upload Request Error');
      if (cp.isUploadForcePossible && this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
        return await this._uploadAppData(cp, data, true);
      } else {
        this._snackService.open({
          msg: T.F.SYNC.S.UPLOAD_ERROR,
          translateParams: {
            err: truncate(
              successRev?.toString ? successRev.toString() : (successRev as any),
              100,
            ),
          },
          type: 'ERROR',
        });
      }
    }
  }

  private async _importAppData(
    cp: SyncProviderServiceInterface,
    data: AppDataComplete,
    rev: string,
  ): Promise<void> {
    if (!data) {
      const r = await this._downloadAppData(cp);
      data = r.data as AppDataComplete;
      rev = r.rev;
    }
    if (!rev) {
      throw new Error('No rev given during import');
    }

    if (!data.lastLocalSyncModelChange) {
      throw new Error('No valid lastLocalSyncModelChange given during import');
    }

    await this._dataImportService.importCompleteSyncData(data);
    await this._setLocalRevAndLastSync(cp, rev, data.lastLocalSyncModelChange);
  }

  // LS HELPER
  // ---------
  private async _getLocalRev(cp: SyncProviderServiceInterface): Promise<string | null> {
    const localSyncMeta = await this._persistenceLocalService.load();
    return localSyncMeta[cp.id].rev;
  }

  // NOTE: last sync should always equal localLastChange
  private async _setLocalRevAndLastSync(
    cp: SyncProviderServiceInterface,
    rev: string,
    lastSync: number,
  ): Promise<unknown> {
    if (!rev) {
      console.log(cp, rev);
      throw new Error('No rev given');
    }
    if (typeof (lastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given ' + lastSync);
    }
    const localSyncMeta = await this._persistenceLocalService.load();
    return this._persistenceLocalService.save({
      ...localSyncMeta,
      [cp.id]: {
        rev,
        lastSync,
      },
    });
  }

  // OTHER
  // -----
  private async _handleConflict(
    cp: SyncProviderServiceInterface,
    {
      remote,
      local,
      lastSync,
      rev,
    }: {
      remote: AppDataComplete;
      local: AppDataComplete;
      lastSync: number;
      rev: string;
    },
  ) {
    const dr = await this._openConflictDialog$({
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange,
    }).toPromise();

    if (dr === 'USE_LOCAL') {
      this._log(cp, 'Dialog => ↑ Remote Update');
      return await this._uploadAppData(cp, local, true);
    } else if (dr === 'USE_REMOTE') {
      this._log(cp, 'Dialog => ↓ Update Local');
      return await this._importAppData(cp, remote, rev);
    }
    return;
  }

  private _openConflictDialog$({
    remote,
    local,
    lastSync,
  }: {
    remote: number | null;
    local: number | null;
    lastSync: number;
  }): Observable<DialogConflictResolutionResult> {
    return this._matDialog
      .open(DialogSyncConflictComponent, {
        restoreFocus: true,
        disableClose: true,
        data: {
          remote,
          local,
          lastSync,
        },
      })
      .afterClosed();
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  }

  private _log(cp: SyncProviderServiceInterface, ...args: any | any[]) {
    return console.log(cp.id, ...args);
  }
}
