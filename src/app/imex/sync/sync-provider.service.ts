import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { DropboxSyncService } from './dropbox/dropbox-sync.service';
import { SyncProvider, SyncProviderServiceInterface } from './sync-provider.model';
import { GlobalConfigService } from '../../features/config/global-config.service';
import {
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
} from 'rxjs/operators';
import { SyncConfig } from '../../features/config/global-config.model';
import {
  AppDataComplete,
  DialogConflictResolutionResult,
  DialogPermissionResolutionResult,
  SyncResult,
} from './sync.model';
import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogSyncPermissionComponent } from './dialog-sync-permission/dialog-sync-permission.component';
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
import { LocalFileSyncAndroidService } from './local-file-sync/local-file-sync-android.service';
import { LocalFileSyncElectronService } from './local-file-sync/local-file-sync-electron.service';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../../features/android/android-interface';
import { CompressionService } from '../../core/compression/compression.service';

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
        case SyncProvider.WebDAV:
          return this._webDavSyncService;
        case SyncProvider.LocalFile:
          if (IS_ANDROID_WEB_VIEW) {
            return this._localFileSyncAndroidService;
          } else {
            return this._localFileSyncElectronService;
          }
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

  constructor(
    private _dropboxSyncService: DropboxSyncService,
    private _dataImportService: DataImportService,
    private _webDavSyncService: WebDavSyncService,
    private _localFileSyncElectronService: LocalFileSyncElectronService,
    private _localFileSyncAndroidService: LocalFileSyncAndroidService,
    private _globalConfigService: GlobalConfigService,
    private _persistenceLocalService: PersistenceLocalService,
    private _translateService: TranslateService,
    private _syncTriggerService: SyncTriggerService,
    private _persistenceService: PersistenceService,
    private _compressionService: CompressionService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
  ) {}

  async sync(): Promise<SyncResult> {
    const currentProvider = await this.currentProvider$.pipe(take(1)).toPromise();
    if (!currentProvider) {
      throw new Error('No Sync Provider for sync()');
    }
    if (
      currentProvider === this._localFileSyncAndroidService &&
      !androidInterface.isGrantedFilePermission()
    ) {
      const res = await this._openPermissionDialog$().toPromise();
      if (res === 'DISABLED_SYNC') {
        this._log(currentProvider, 'Dialog => Disable Sync');
        return 'USER_ABORT';
      }
    }

    this.isSyncing$.next(true);
    try {
      const r = await this._sync(currentProvider);
      this.isSyncing$.next(false);
      return r;
    } catch (e) {
      console.log('__error during sync__');
      console.error(e);
      this._snackService.open({
        msg: T.F.SYNC.S.UNKNOWN_ERROR,
        type: 'ERROR',
        translateParams: {
          err: getSyncErrorStr(e),
        },
      });
      this.isSyncing$.next(false);
      return 'ERROR';
    }
  }

  private async _sync(cp: SyncProviderServiceInterface): Promise<SyncResult> {
    let local: AppDataComplete | undefined;

    const isReady = await cp.isReady$.pipe(first()).toPromise();
    if (!isReady) {
      this._snackService.open({
        msg: T.F.SYNC.S.INCOMPLETE_CFG,
        type: 'ERROR',
      });
      return 'ERROR';
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
        const localLocal = await this._persistenceService.getValidCompleteData();
        await this._uploadAppData(cp, localLocal);
        return 'SUCCESS';
      }
      // NOTE: includes HANDLED_ERROR and Error
      return 'ERROR';
    } else if (revRes instanceof Error) {
      this._snackService.open({
        msg: T.F.SYNC.S.UNKNOWN_ERROR,
        translateParams: {
          err: getSyncErrorStr(revRes),
        },
        type: 'ERROR',
      });
      return 'ERROR';
    }

    const { rev, clientUpdate } = revRes as { rev: string; clientUpdate: number };

    console.log({ rev, localRev });

    if (rev && rev === localRev) {
      this._log(cp, 'PRE1: ↔ Same Rev', rev);
      // NOTE: same rev, doesn't mean. that we can't have local changes
      local = await this._persistenceService.getValidCompleteData();
      if (lastSync === local.lastLocalSyncModelChange) {
        this._log(cp, 'PRE1: No local changes to sync');
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.S.ALREADY_IN_SYNC_NO_LOCAL_CHANGES,
          config: { duration: 1600 },
        });
        return 'NO_UPDATE_REQUIRED';
      }
    }

    // PRE CHECK 2
    // simple check based on local meta
    // simple check if lastLocalSyncModelChange
    // ------------------------------------
    local = local || (await this._persistenceService.getValidCompleteData());
    // NOTE: should never be the case, but we need to make sure it is
    if (typeof local.lastLocalSyncModelChange !== 'number') {
      console.log(local);
      alert('Error during sync: No lastLocalSyncModelChange');
      throw new Error('Sync failed: No lastLocalSyncModelChange');
    } else if (local.lastLocalSyncModelChange === 0) {
      if (!this._c(T.F.SYNC.C.EMPTY_SYNC)) {
        this._log(cp, 'PRE2: Abort');
        return 'USER_ABORT';
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
      await this._uploadAppData(cp, local);
      return 'SUCCESS';
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
        await this._uploadAppData(cp, local);
        return 'SUCCESS';
      } else {
        return 'USER_ABORT';
      }
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
        this._snackService.open({
          type: 'SUCCESS',
          msg: T.F.SYNC.S.ALREADY_IN_SYNC,
          config: { duration: 1600 },
        });
        return 'NO_UPDATE_REQUIRED';
      }

      case UpdateCheckResult.LocalUpdateRequired: {
        this._log(cp, '↓ Update Local');
        await this._importAppData(cp, remote, r.rev as string);
        return 'SUCCESS';
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        this._log(cp, '↑ Update Remote');
        await this._uploadAppData(cp, local);
        return 'SUCCESS';
      }

      case UpdateCheckResult.RemoteNotUpToDateDespiteSync: {
        this._log(cp, 'X Remote not up to date despite sync');
        if (this._c(T.F.SYNC.C.TRY_LOAD_REMOTE_AGAIN)) {
          return this.sync();
        } else {
          await this._handleConflict(cp, { remote, local, lastSync, rev: r.rev });
          return 'CONFLICT_DIALOG';
        }
      }

      case UpdateCheckResult.DataDiverged: {
        this._log(cp, '^--------^-------^');
        this._log(cp, '⇎ X Diverged Data');
        await this._handleConflict(cp, { remote, local, lastSync, rev: r.rev });
        return 'CONFLICT_DIALOG';
      }

      case UpdateCheckResult.LastSyncNotUpToDate: {
        this._log(cp, 'X Last Sync not up to date');
        await this._setLocalRevAndLastSync(cp, r.rev, local.lastLocalSyncModelChange);
        return 'SPECIAL';
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        this._log(cp, 'XXX Wrong Data');
        if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
          if (this._c(T.F.SYNC.C.FORCE_UPLOAD)) {
            await this._uploadAppData(cp, local, true);
            return 'SUCCESS';
          }
        } else {
          if (this._c(T.F.SYNC.C.FORCE_IMPORT)) {
            await this._importAppData(cp, remote, r.rev as string);
            return 'SUCCESS';
          }
        }
        return 'ERROR';
      }
    }
  }

  // WRAPPER
  // -------
  private async _downloadAppData(
    cp: SyncProviderServiceInterface,
  ): Promise<{ rev: string; data: AppDataComplete | undefined }> {
    const localRev = await this._getLocalRev(cp);
    const { dataStr, rev } = await cp.downloadAppData(localRev);
    return {
      rev,
      data: await this._decompressAppDataIfNeeded(dataStr),
    };
  }

  private async _uploadAppData(
    cp: SyncProviderServiceInterface,
    data: AppDataComplete,
    isForceOverwrite: boolean = false,
    retryAttempts = 0,
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

    const dataStrToUpload = await this._compressAppDataIfEnabled(data);
    const localRev = await this._getLocalRev(cp);
    const successRev = await cp.uploadAppData(
      dataStrToUpload,
      data.lastLocalSyncModelChange as number,
      localRev,
      isForceOverwrite,
    );
    if (typeof successRev === 'string') {
      this._log(cp, '↑ Uploaded Data ↑ ✓');
      return await this._setLocalRevAndLastSync(
        cp,
        successRev,
        data.lastLocalSyncModelChange,
      );
    } else {
      this._log(cp, 'X Upload Request Error');
      if (
        cp.isUploadForcePossible &&
        (!retryAttempts || this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR))
      ) {
        return await this._uploadAppData(cp, data, true, retryAttempts + 1);
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

    await this._dataImportService.importCompleteSyncData(data, {
      isOmitLocalFields: true,
    });
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
  ): Promise<void> {
    if (!rev) {
      console.log(cp, rev);
      throw new Error('No rev given');
    }
    if (typeof (lastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given ' + lastSync);
    }
    const localSyncMeta = await this._persistenceLocalService.load();
    await this._persistenceLocalService.save({
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
  ): Promise<void> {
    if (IS_ANDROID_WEB_VIEW) {
      androidInterface.showNotificationIfAppIsNotOpen?.(
        this._translateService.instant(T.ANDROID.NOTIFICATIONS.SYNC_CONFLICT_TITLE),
        this._translateService.instant(T.ANDROID.NOTIFICATIONS.SYNC_CONFLICT_MSG),
      );
    }
    const dr = await this._openConflictDialog$({
      local: local.lastLocalSyncModelChange,
      lastSync,
      remote: remote.lastLocalSyncModelChange,
    }).toPromise();

    if (dr === 'USE_LOCAL') {
      this._log(cp, 'Dialog => ↑ Remote Update');
      await this._uploadAppData(cp, local, true);
    } else if (dr === 'USE_REMOTE') {
      this._log(cp, 'Dialog => ↓ Update Local');
      await this._importAppData(cp, remote, rev);
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

  private _openPermissionDialog$(): Observable<DialogPermissionResolutionResult> {
    return this._matDialog
      .open(DialogSyncPermissionComponent, {
        restoreFocus: true,
        disableClose: true,
      })
      .afterClosed();
  }

  private async _decompressAppDataIfNeeded(
    backupStr: AppDataComplete | string | undefined,
  ): Promise<AppDataComplete | undefined> {
    // if the data was a json string it happens (for dropbox) that the data is returned as object
    if (typeof backupStr === 'object' && backupStr?.task) {
      return backupStr as AppDataComplete;
    }
    if (typeof backupStr === 'string') {
      try {
        return JSON.parse(backupStr) as AppDataComplete;
      } catch (e) {
        try {
          const decompressedData = await this._compressionService.decompressUTF16(
            backupStr,
          );
          return JSON.parse(decompressedData) as AppDataComplete;
        } catch (ex) {
          console.error('Sync, invalid data');
          console.warn(ex);
        }
      }
    }
    return undefined;
  }

  private async _compressAppDataIfEnabled(data: AppDataComplete): Promise<string> {
    const isCompressionEnabled = (await this.syncCfg$.pipe(first()).toPromise())
      .isCompressionEnabled;
    return isCompressionEnabled
      ? this._compressionService.compressUTF16(JSON.stringify(data))
      : JSON.stringify(data);
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  }

  private _log(cp: SyncProviderServiceInterface, ...args: any | any[]): void {
    console.log(cp.id, ...args);
  }
}
