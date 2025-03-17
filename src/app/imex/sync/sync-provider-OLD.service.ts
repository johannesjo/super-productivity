import { inject, Injectable } from '@angular/core';
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
  AppArchiveFileData,
  AppDataComplete,
  AppMainFileData,
  AppMainFileNoRevsData,
  DialogConflictResolutionResult,
  DialogPermissionResolutionResult,
  LocalSyncMetaForProvider,
  SyncResult,
} from './sync.model';
import { T } from '../../t.const';
import { checkForUpdate, UpdateCheckResult } from './check-for-update.util';
import { DialogSyncConflictComponent } from './dialog-dbx-sync-conflict/dialog-sync-conflict.component';
import { DialogSyncPermissionComponent } from './dialog-sync-permission/dialog-sync-permission.component';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DataImportService } from './data-import.service';
import { WebDavSyncService } from './web-dav/web-dav-sync.service';
import { SnackService } from '../../core/snack/snack.service';
import { isValidAppData } from './is-valid-app-data.util';
import { PersistenceLocalService } from '../../core/persistence/persistence-local.service';
import { getSyncErrorStr } from './get-sync-error-str';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { LocalFileSyncAndroidService } from './local-file-sync/local-file-sync-android.service';
import { LocalFileSyncElectronService } from './local-file-sync/local-file-sync-electron.service';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../../features/android/android-interface';
import { CompressionService } from '../../core/compression/compression.service';
import { decrypt, encrypt } from './encryption';
import { LS } from '../../core/persistence/storage-keys.const';
import { PREPEND_STR_COMPRESSION, PREPEND_STR_ENCRYPTION } from './sync.const';
import { GlobalProgressBarService } from '../../core-ui/global-progress-bar/global-progress-bar.service';
import {
  DialogIncompleteSyncComponent,
  DialogIncompleteSyncData,
} from './dialog-incomplete-sync/dialog-incomplete-sync.component';

const KNOWN_SYNC_ERROR_PREFIX = 'KNOWN_SYNC_ERROR_SUP_';

@Injectable({
  providedIn: 'root',
})
export class SyncProviderService {
  private _dropboxSyncService = inject(DropboxSyncService);
  private _dataImportService = inject(DataImportService);
  private _webDavSyncService = inject(WebDavSyncService);
  private _localFileSyncElectronService = inject(LocalFileSyncElectronService);
  private _localFileSyncAndroidService = inject(LocalFileSyncAndroidService);
  private _globalConfigService = inject(GlobalConfigService);
  private _persistenceLocalService = inject(PersistenceLocalService);
  private _translateService = inject(TranslateService);
  private _persistenceService = inject(PersistenceService);
  private _compressionService = inject(CompressionService);
  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);
  private _globalProgressBarService = inject(GlobalProgressBarService);

  private _currentProviderLastSync$ = new BehaviorSubject(0);

  // NOTE: not really reliable for all cases, but likely good enough for what we need
  isCurrentProviderInSync$ = combineLatest([
    this._currentProviderLastSync$,
    this._persistenceLocalService.lastSnyModelChange$,
  ]).pipe(map(([lastSync, lastModelChange]) => lastSync && lastSync === lastModelChange));

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

  async sync(): Promise<SyncResult> {
    const currentProvider = await this.currentProvider$.pipe(take(1)).toPromise();
    if (!currentProvider) {
      throw new Error('No Sync Provider for sync()');
    }
    if (
      currentProvider === this._localFileSyncAndroidService &&
      !androidInterface.isGrantedFilePermission()
    ) {
      if (androidInterface.isGrantFilePermissionInProgress) {
        console.log('Abort sync since currently choosing folder to give access');
        return 'USER_ABORT';
      }

      const res = await this._openPermissionDialog$().toPromise();
      if (res === 'DISABLED_SYNC') {
        this._log(currentProvider, 'Dialog => Disable Sync');
        return 'USER_ABORT';
      }
    }

    this._globalProgressBarService.countUp('SYNC');
    this.isSyncing$.next(true);
    try {
      const r = await this._sync(currentProvider);
      this.isSyncing$.next(false);
      this._globalProgressBarService.countDown();
      return r;
    } catch (e) {
      this._globalProgressBarService.countDown();
      console.log('__error during sync__');
      console.error(e);
      const errStr = getSyncErrorStr(e);

      if (errStr.includes(KNOWN_SYNC_ERROR_PREFIX)) {
        this._snackService.open({
          msg: errStr.replace(KNOWN_SYNC_ERROR_PREFIX, ''),
          type: 'ERROR',
        });
      } else {
        this._snackService.open({
          msg: T.F.SYNC.S.UNKNOWN_ERROR,
          type: 'ERROR',
          translateParams: {
            err: getSyncErrorStr(e),
          },
        });
      }
      this.isSyncing$.next(false);
      return 'ERROR';
    }
  }

  private async _sync(cp: SyncProviderServiceInterface): Promise<SyncResult> {
    let local: AppDataComplete | undefined;
    let isReady: boolean = false;
    try {
      isReady = await cp.isReady$.pipe(first()).toPromise();
    } catch (e) {
      isReady = false;
    }
    if (!isReady) {
      console.log('syncProviderCfg', cp);
      this._snackService.open({
        msg: T.F.SYNC.S.INCOMPLETE_CFG,
        type: 'ERROR',
      });
      return 'ERROR';
    }
    const localSyncMeta = await this._persistenceLocalService.load();
    const lastSync = localSyncMeta[cp.id].lastSync;
    const localRev = localSyncMeta[cp.id].rev;

    if (this._currentProviderLastSync$.getValue() !== lastSync) {
      this._currentProviderLastSync$.next(lastSync);
    }

    // PRE CHECK 1
    // check if remote data & file revision changed
    // --------------------------------------------
    const revRes = await cp.getFileRevAndLastClientUpdate('MAIN', localRev);

    // NOTE : in success cases it is an object
    if (typeof revRes === 'string' && revRes === 'NO_REMOTE_DATA') {
      console.log('revRes was', revRes);
      // TODO remove at some point
      const isPossibleLegacyData =
        !localSyncMeta[cp.id].revTaskArchive &&
        localSyncMeta[cp.id].revTaskArchive !== null;
      if (isPossibleLegacyData && localStorage.getItem(LS.LAST_LOCAL_SYNC_MODEL_CHANGE)) {
        alert(this._translateService.instant(T.F.SYNC.A.POSSIBLE_LEGACY_DATA));
        localStorage.removeItem(LS.LAST_LOCAL_SYNC_MODEL_CHANGE);
      }
      if (this._c(T.F.SYNC.C.NO_REMOTE_DATA)) {
        this._log(cp, '↑ Update Remote after no getFileRevAndLastClientUpdate()');
        const localLocal = await this._persistenceService.getValidCompleteData();
        await this._uploadAppData({
          cp,
          localDataComplete: localLocal,
          isForceArchiveUpdate: true,
        });
        return 'SUCCESS';
      }
      // NOTE: includes HANDLED_ERROR and Error
      return 'ERROR';
    } else if (typeof revRes === 'string') {
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

    const { rev, clientUpdate } = revRes as { rev: string | null; clientUpdate: number };

    if (!rev) {
      console.error('No valid rev returned from remote');
      console.log(revRes);
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.SYNC.S.ERROR_NO_REV,
      });
    }

    console.log({ rev, localRev });

    if (rev && this._isSameRev(rev, localRev)) {
      this._log(cp, 'PRE1: ↔ Same Rev', rev);
      // NOTE: same mainFileRev, doesn't mean. that we can't have local changes
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
      await this._uploadAppData({ cp, localDataComplete: local });
      return 'SUCCESS';
    }

    // PRE CHECK 4
    // DOWNLOAD OF REMOTE (and possible error)
    let r;
    try {
      r = await this._downloadMainFileAppData(cp);
    } catch (e) {
      console.error(e);
      console.error('Download Data failed');
      this._snackService.open({
        msg: T.F.SYNC.S.ERROR_UNABLE_TO_READ_REMOTE_DATA,
        translateParams: {
          err: getSyncErrorStr(revRes),
        },
        type: 'ERROR',
      });

      if (this._c(T.F.SYNC.C.UNABLE_TO_LOAD_REMOTE_DATA)) {
        this._log(cp, '↑ PRE4: Update Remote after download error');
        await this._uploadAppData({
          cp,
          localDataComplete: local,
          isForceArchiveUpdate: true,
        });
        return 'SUCCESS';
      } else {
        return 'USER_ABORT';
      }
    }

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
        this._log(cp, '↑ PRE5: Update Remote');
        await this._uploadAppData({
          cp,
          localDataComplete: local,
          isForceArchiveUpdate: true,
        });
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
        await this._importMainFileAppDataAndArchiveIfNecessary({
          cp,
          remoteMainFileData: remote,
          localComplete: local,
          mainFileRev: r.rev as string,
        });
        return 'SUCCESS';
      }

      case UpdateCheckResult.RemoteUpdateRequired: {
        this._log(cp, '↑ Update Remote');
        await this._uploadAppData({ cp, localDataComplete: local });
        return 'SUCCESS';
      }

      case UpdateCheckResult.RemoteNotUpToDateDespiteSync: {
        this._log(cp, 'X Remote not up to date despite sync');
        if (this._c(T.F.SYNC.C.TRY_LOAD_REMOTE_AGAIN)) {
          return this.sync();
        } else {
          await this._handleMainFileConflict({ cp, remote, local, lastSync, rev: r.rev });
          return 'CONFLICT_DIALOG';
        }
      }

      case UpdateCheckResult.DataDiverged: {
        this._log(cp, '^--------^-------^');
        this._log(cp, '⇎ X Diverged Data');
        await this._handleMainFileConflict({ cp, remote, local, lastSync, rev: r.rev });
        return 'CONFLICT_DIALOG';
      }

      case UpdateCheckResult.LastSyncNotUpToDate: {
        this._log(cp, 'X Last Sync not up to date');
        await this._setLocalRevsAndLastSync(
          cp,
          r.rev,
          'NO_UPDATE',
          local.lastLocalSyncModelChange,
        );
        return 'SPECIAL';
      }

      case UpdateCheckResult.ErrorInvalidTimeValues:
      case UpdateCheckResult.ErrorLastSyncNewerThanLocal: {
        this._log(cp, 'XXX Wrong Data');
        if (local.lastLocalSyncModelChange > remote.lastLocalSyncModelChange) {
          if (this._c(T.F.SYNC.C.FORCE_UPLOAD)) {
            await this._uploadAppData({
              cp,
              localDataComplete: local,
              isForceOverwrite: true,
            });
            return 'SUCCESS';
          }
        } else {
          if (this._c(T.F.SYNC.C.FORCE_IMPORT)) {
            await this._importMainFileAppDataAndArchiveIfNecessary({
              cp,
              remoteMainFileData: remote,
              localComplete: local,
              mainFileRev: r.rev as string,
              isForceArchiveUpdate: true,
            });
            return 'SUCCESS';
          }
        }
        return 'ERROR';
      }
    }
  }

  // WRAPPER
  // -------
  private async _downloadMainFileAppData(
    cp: SyncProviderServiceInterface,
  ): Promise<{ rev: string; data: AppMainFileData | undefined }> {
    this._log(cp, '↓ downloading main file');
    const localRev = await this._getLocalMainFileRev(cp);
    const { dataStr, rev } = await cp.downloadFileData('MAIN', localRev);
    return {
      rev,
      data: await this._decompressAndDecryptDataIfNeeded<AppMainFileData>(dataStr),
    };
  }

  private async _downloadArchiveFileAppData(
    cp: SyncProviderServiceInterface,
  ): Promise<{ rev: string; data: AppArchiveFileData | undefined }> {
    this._log(cp, '↓ downloading archive file');
    const localRev = await this._getLocalArchiveFileRev(cp);
    const { dataStr, rev } = await cp.downloadFileData('ARCHIVE', localRev);
    return {
      rev,
      data: await this._decompressAndDecryptDataIfNeeded<AppArchiveFileData>(dataStr),
    };
  }

  private async _uploadAppData({
    cp,
    localDataComplete,
    isForceOverwrite = false,
    retryAttemptNr = 0,
    isForceArchiveUpdate = false,
  }: {
    cp: SyncProviderServiceInterface;
    localDataComplete: AppDataComplete;
    isForceArchiveUpdate?: boolean;
    isForceOverwrite?: boolean;
    retryAttemptNr?: number;
  }): Promise<void> {
    const NR_OF_RETRIES = 1;
    // TODO extract
    const retryIfPossibleOrWarnUser = async (
      revOrError: string | Error,
      isForMainFile: boolean,
    ): Promise<void> => {
      this._log(cp, 'X Upload Request Error retryIfPossibleOrWarnUser()', revOrError);
      if (
        cp.id !== SyncProvider.LocalFile &&
        (retryAttemptNr < NR_OF_RETRIES ||
          (cp.isUploadForcePossible &&
            retryAttemptNr === 1 &&
            this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)))
      ) {
        return await this._uploadAppData({
          cp,
          localDataComplete,
          isForceOverwrite: true,
          retryAttemptNr: retryAttemptNr + 1,
        });
      } else {
        // inform user if archive was uploaded but main file wasn't
        if (
          isForMainFile &&
          typeof successRevArchiveOrError === 'string' &&
          successRevArchiveOrError !== 'NO_UPDATE'
        ) {
          alert(this._translateService.instant(T.F.SYNC.A.ARCHIVE_ONLY_UPLOADED));
        }
        throw new Error(
          KNOWN_SYNC_ERROR_PREFIX +
            this._translateService.instant(T.F.SYNC.S.UPLOAD_ERROR, {
              err: getSyncErrorStr(revOrError),
            }),
        );
      }
    };

    if (!isValidAppData(localDataComplete)) {
      console.log(localDataComplete);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }
    if (typeof localDataComplete.lastLocalSyncModelChange !== 'number') {
      console.log(localDataComplete);
      alert('Error: lastLocalSyncModelChange is not defined');
      throw new Error('lastLocalSyncModelChange is not defined');
    }

    const localSyncProviderData = await this._getLocalSyncProviderData(cp);
    const { archive, mainNoRevs } = this._splitData(localDataComplete);

    let successRevArchiveOrError: string | Error | undefined = 'NO_UPDATE';
    // check if archive was updated and upload first if that is the case
    if (
      isForceArchiveUpdate ||
      (localDataComplete.lastArchiveUpdate &&
        localDataComplete.lastArchiveUpdate > localSyncProviderData.lastSync)
    ) {
      const dataStrToUpload = await this._compressAndEncryptDataIfEnabled(archive);

      try {
        successRevArchiveOrError = await cp.uploadFileData(
          'ARCHIVE',
          dataStrToUpload,
          localSyncProviderData.revTaskArchive,
          isForceOverwrite,
        );
        if (typeof successRevArchiveOrError !== 'string') {
          console.log(successRevArchiveOrError);
          throw new Error('No rev returned from no error archive response');
        }
      } catch (e) {
        return await retryIfPossibleOrWarnUser(e as Error, false);
      }
      this._log(cp, '↑ Uploaded ARCHIVE Data ↑ ✓ +' + successRevArchiveOrError);
    }

    const mainData: AppMainFileData = {
      ...mainNoRevs,
      archiveLastUpdate: localDataComplete.lastArchiveUpdate as number,
      archiveRev:
        successRevArchiveOrError === 'NO_UPDATE'
          ? (localSyncProviderData.revTaskArchive as string)
          : successRevArchiveOrError,
    };
    const dataStrToUpload = await this._compressAndEncryptDataIfEnabled(mainData);

    try {
      const successRevMainOrError = await cp.uploadFileData(
        'MAIN',
        dataStrToUpload,
        localSyncProviderData.rev,
        isForceOverwrite,
      );
      if (typeof successRevMainOrError === 'string') {
        this._log(cp, '↑ Uploaded MAIN Data ↑ ✓');
        return await this._setLocalRevsAndLastSync(
          cp,
          successRevMainOrError,
          successRevArchiveOrError,
          localDataComplete.lastLocalSyncModelChange,
        );
      } else {
        console.log(successRevMainOrError);
        throw new Error('No rev returned from no error main response');
      }
    } catch (e) {
      return await retryIfPossibleOrWarnUser(e as Error, false);
    }
  }

  private _splitData = (
    data: AppDataComplete,
  ): { archive: AppArchiveFileData; mainNoRevs: AppMainFileNoRevsData } => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { taskArchive, archivedProjects, lastArchiveUpdate, ...mainNoRevs } = data;

    return {
      archive: {
        taskArchive,
        archivedProjects,
      },
      mainNoRevs,
    };
  };

  private async _importMainFileAppDataAndArchiveIfNecessary({
    cp,
    remoteMainFileData,
    localComplete,
    mainFileRev,
    isForceArchiveUpdate = false,
  }: {
    cp: SyncProviderServiceInterface;
    remoteMainFileData: AppMainFileData;
    localComplete: AppDataComplete;
    isForceArchiveUpdate?: boolean;
    mainFileRev: string;
  }): Promise<void> {
    if (!remoteMainFileData) {
      const r = await this._downloadMainFileAppData(cp);
      remoteMainFileData = r.data as AppMainFileData;
      mainFileRev = r.rev;
    }
    if (!mainFileRev) {
      throw new Error('No mainFileRev given during import');
    }
    if (!remoteMainFileData.lastLocalSyncModelChange) {
      throw new Error('No valid lastLocalSyncModelChange given during import');
    }
    if (
      typeof localComplete.lastArchiveUpdate !== 'number' &&
      localComplete.taskArchive.ids.length > 0
    ) {
      throw new Error('No valid localComplete.lastArchiveUpdate given during import');
    }
    if (remoteMainFileData.archiveRev === 'NO_UPDATE') {
      throw new Error(
        'No valid remoteMainFileData.archiveRev given during import – "NO_UPDATE"',
      );
    }

    let remoteArchiveData: AppArchiveFileData | undefined;
    let remoteArchiveRev: string | 'NO_UPDATE' = 'NO_UPDATE';
    // NOTE initially there might never have been an archive
    if (
      isForceArchiveUpdate ||
      (remoteMainFileData.archiveLastUpdate &&
        (!localComplete.lastArchiveUpdate ||
          remoteMainFileData.archiveLastUpdate > localComplete.lastArchiveUpdate))
    ) {
      this._log(
        cp,
        isForceArchiveUpdate
          ? 'Archive force update on local chosen. Downloading...'
          : 'Archive was updated on remote. Downloading...',
      );
      const res = await this._downloadArchiveFileAppData(cp);
      if (!res.rev) {
        throw new Error('No archive rev given during import');
      }
      if (!res.data) {
        throw new Error('No archive data found in remote response for archive file');
      }
      remoteArchiveRev = res.rev;
      remoteArchiveData = res.data;
    }

    if (
      remoteArchiveRev !== 'NO_UPDATE' &&
      // NOTE: main file archiveRev might be undefined when archive was never synced before with current data, but the file was created earlier
      remoteMainFileData.archiveRev &&
      !this._isSameRev(remoteArchiveRev, remoteMainFileData.archiveRev)
    ) {
      console.log({
        remoteArchiveRev,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'remoteMainFileData.archiveRev': remoteMainFileData.archiveRev,
        remoteArchiveRevD: new Date(+remoteArchiveRev),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'remoteMainFileData.archiveRevD': new Date(+remoteMainFileData.archiveRev),
      });
      const data: DialogIncompleteSyncData = {
        archiveRevReal: remoteArchiveRev,
        archiveRevInMainFile: remoteMainFileData?.archiveRev,
      };
      const res = await this._matDialog
        .open(DialogIncompleteSyncComponent, {
          data,
        })
        .afterClosed()
        .toPromise();
      if (res === 'FORCE_UPDATE_REMOTE') {
        await this._uploadAppData({
          cp,
          localDataComplete: await this._persistenceService.getValidCompleteData(),
          isForceOverwrite: true,
          isForceArchiveUpdate: true,
        });
      } else {
        throw new Error('Remote archive rev does not match the one in remote main file');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { archiveRev, archiveLastUpdate, ...cleanedRemoteMainFile } =
      remoteMainFileData;
    const completeData: AppDataComplete = {
      ...cleanedRemoteMainFile,
      ...(remoteArchiveData
        ? {
            taskArchive: remoteArchiveData.taskArchive,
            archivedProjects: remoteArchiveData.archivedProjects,
            lastArchiveUpdate: remoteMainFileData.archiveLastUpdate,
          }
        : {
            taskArchive: localComplete.taskArchive,
            archivedProjects: localComplete.archivedProjects,
            lastArchiveUpdate: localComplete.lastArchiveUpdate,
          }),
    };

    await this._dataImportService.importCompleteSyncData(completeData, {
      isOmitLocalFields: true,
    });

    await this._setLocalRevsAndLastSync(
      cp,
      mainFileRev,
      remoteArchiveRev,
      remoteMainFileData.lastLocalSyncModelChange,
    );
  }

  // LS HELPER
  // ---------
  private async _getLocalMainFileRev(
    cp: SyncProviderServiceInterface,
  ): Promise<string | null> {
    const localSyncMeta = await this._getLocalSyncProviderData(cp);
    return localSyncMeta.rev;
  }

  private async _getLocalArchiveFileRev(
    cp: SyncProviderServiceInterface,
  ): Promise<string | null> {
    const localSyncMeta = await this._getLocalSyncProviderData(cp);
    return localSyncMeta.revTaskArchive;
  }

  private async _getLocalSyncProviderData(
    cp: SyncProviderServiceInterface,
  ): Promise<LocalSyncMetaForProvider> {
    const localSyncMeta = await this._persistenceLocalService.load();
    return localSyncMeta[cp.id];
  }

  // NOTE: last sync should always equal localLastChange
  private async _setLocalRevsAndLastSync(
    cp: SyncProviderServiceInterface,
    rev: string,
    revTaskArchive: string | 'NO_UPDATE',
    lastSync: number,
  ): Promise<void> {
    if (!rev) {
      console.log(cp, rev);
      throw new Error('No mainFileRev given');
    }
    if (typeof (lastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given ' + lastSync);
    }
    const localSyncMeta = await this._persistenceLocalService.load();
    const localSyncMetaForProvider: LocalSyncMetaForProvider = {
      ...localSyncMeta[cp.id],
      lastSync,
      rev,
      revTaskArchive:
        revTaskArchive === 'NO_UPDATE'
          ? localSyncMeta[cp.id].revTaskArchive
          : revTaskArchive,
    };
    this._currentProviderLastSync$.next(lastSync);
    await this._persistenceLocalService.save({
      ...localSyncMeta,
      [cp.id]: localSyncMetaForProvider,
    });
  }

  // OTHER
  // -----
  private async _handleMainFileConflict({
    cp,
    remote,
    local,
    lastSync,
    rev,
  }: {
    cp: SyncProviderServiceInterface;
    remote: AppMainFileData;
    local: AppDataComplete;
    lastSync: number;
    rev: string;
  }): Promise<void> {
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
      await this._uploadAppData({
        cp,
        localDataComplete: local,
        isForceOverwrite: true,
        isForceArchiveUpdate: true,
      });
    } else if (dr === 'USE_REMOTE') {
      this._log(cp, 'Dialog => ↓ Update Local');
      await this._importMainFileAppDataAndArchiveIfNecessary({
        cp,
        remoteMainFileData: remote,
        localComplete: local,
        mainFileRev: rev,
        isForceArchiveUpdate: true,
      });
    }
    return;
  }

  private lastDialog?: MatDialogRef<any, any>;

  private _openConflictDialog$({
    remote,
    local,
    lastSync,
  }: {
    remote: number | null;
    local: number | null;
    lastSync: number;
  }): Observable<DialogConflictResolutionResult> {
    if (this.lastDialog) {
      this.lastDialog.close();
    }
    this.lastDialog = this._matDialog.open(DialogSyncConflictComponent, {
      restoreFocus: true,
      disableClose: true,
      data: {
        remote,
        local,
        lastSync,
      },
    });
    return this.lastDialog.afterClosed();
  }

  private _openPermissionDialog$(): Observable<DialogPermissionResolutionResult> {
    return this._matDialog
      .open(DialogSyncPermissionComponent, {
        restoreFocus: true,
        disableClose: true,
      })
      .afterClosed();
  }

  private async _decompressAndDecryptDataIfNeeded<
    T extends AppMainFileData | AppArchiveFileData,
  >(dataInStr: T | string | undefined): Promise<T> {
    // if the data was a json string it happens (for dropbox) that the data is returned as object
    if (
      (dataInStr && (dataInStr as AppMainFileData)?.task) ||
      (dataInStr as AppArchiveFileData)?.taskArchive
    ) {
      return dataInStr as T;
    }
    console.log('dd 1');

    // NOTE: we need then later to make sure that both strings are appended after encryption and compression
    if (typeof dataInStr !== 'string') {
      console.log(typeof dataInStr);
      throw new Error('Unable to parse remote data due to unknown reasons');
    }
    if (dataInStr.trim().length === 0) {
      throw new Error('Empty data string');
    }
    console.log('dd 2');

    if (dataInStr.startsWith(PREPEND_STR_ENCRYPTION)) {
      dataInStr = dataInStr.slice(PREPEND_STR_ENCRYPTION.length);
    }
    if (dataInStr.startsWith(PREPEND_STR_COMPRESSION)) {
      dataInStr = dataInStr.slice(PREPEND_STR_COMPRESSION.length);
    }
    const { isEncryptionEnabled, encryptionPassword } = await this.syncCfg$
      .pipe(first())
      .toPromise();

    try {
      console.log('dd 3');
      // fix legacy data that got double stringified for web dav
      const d = JSON.parse(dataInStr);
      if (typeof d === 'string') {
        console.log('dd 3.1 DOUBLE JSON.parse() needed');
        return JSON.parse(d) as T;
      }
      return d as T;
    } catch (eIgnored) {
      try {
        let dataString = dataInStr;
        if (isEncryptionEnabled && encryptionPassword?.length) {
          try {
            console.time('decrypt');
            dataString = await decrypt(dataInStr, encryptionPassword);
            console.timeEnd('decrypt');
          } catch (eDecryption) {
            console.error(eDecryption);
            // we try to handle if string was compressed before but encryption is enabled in the meantime locally
            if (
              eDecryption &&
              (eDecryption as any).toString &&
              (eDecryption as any).toString() ===
                "InvalidCharacterError: Failed to execute 'atob' on 'Window': The string to be decoded contains characters outside of the Latin1 range."
            ) {
              dataString = await this._compressionService.decompressUTF16(dataString);
            } else {
              throw new Error('SP Decryption Error – Password wrong?');
            }
          }
        }
        try {
          return JSON.parse(dataString) as T;
        } catch (eIgnoredInner) {
          console.warn(eIgnoredInner);
          console.log('dataInStr', dataInStr);
          // try to decompress anyway
          dataString = await this._compressionService.decompressUTF16(dataString);
        }
        if (!dataString) {
          alert(
            this._translateService.instant(T.F.SYNC.S.ERROR_UNABLE_TO_READ_REMOTE_DATA),
          );
          throw new Error('Unable to parse remote data');
        }
        console.log('dd 4');
        return JSON.parse(dataString) as T;
      } catch (eDecompression) {
        console.error('Sync, invalid data');
        console.warn(eDecompression);
        console.log(dataInStr);

        throw new Error(eDecompression as any);
      }
    }
  }

  private async _compressAndEncryptDataIfEnabled(
    data: AppMainFileData | AppArchiveFileData,
  ): Promise<string> {
    const { isCompressionEnabled, isEncryptionEnabled, encryptionPassword } =
      await this.syncCfg$.pipe(first()).toPromise();
    let dataToWrite = JSON.stringify(data);

    // compress first since random data can't be compressed
    if (isCompressionEnabled) {
      dataToWrite = await this._compressionService.compressUTF16(dataToWrite);
    }
    if (isEncryptionEnabled && encryptionPassword?.length) {
      console.time('encrypt');
      dataToWrite = await encrypt(dataToWrite, encryptionPassword);
      console.timeEnd('encrypt');
    }
    return dataToWrite;
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  }

  private _log(cp: SyncProviderServiceInterface, ...args: any | any[]): void {
    console.log(cp.id, ...args);
  }

  private _isSameRev(a: string | null, b: string | null): boolean {
    if (!a || !b) {
      console.warn(`Invalid revs a:${a} and b:${b} given`);
      return false;
    }
    if (a === b) {
      return true;
    }
    return this._cleanRev(a) === this._cleanRev(b);
  }

  private _cleanRev(rev: string): string {
    const suffix = '-gzip';
    if (rev.endsWith(suffix)) {
      return rev.slice(0, -suffix.length);
    }
    return rev;
  }
}
