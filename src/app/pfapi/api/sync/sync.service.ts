import {
  ConflictData,
  EncryptAndCompressCfg,
  LocalMeta,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
  UploadMeta,
} from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import { SyncProviderId, SyncStatus } from '../pfapi.const';
import {
  ImpossibleError,
  LockFromLocalClientPresentError,
  ModelVersionToImportNewerThanLocalError,
  NoRemoteMetaFile,
  UnknownSyncStateError,
} from '../errors/errors';
import { PFLog } from '../../../core/log';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { cleanRev } from '../util/clean-rev';
import { getSyncStatusFromMetaFiles } from '../util/get-sync-status-from-meta-files';
import { validateRevMap } from '../util/validate-rev-map';
import { loadBalancer } from '../util/load-balancer';
import { Pfapi } from '../pfapi';
import { modelVersionCheck, ModelVersionCheckResult } from '../util/model-version-check';
import { MetaSyncService } from './meta-sync.service';
import { ModelSyncService } from './model-sync.service';
import {
  mergeVectorClocks,
  incrementVectorClock,
  limitVectorClockSize,
  sanitizeVectorClock,
} from '../util/vector-clock';
import { getVectorClock } from '../util/backwards-compat';

/**
 * Sync Service for Super Productivity
 *
 * Change Detection System:
 * Uses vector clocks for detecting concurrent changes and conflicts between devices.
 * Each client maintains its own counter in the vector clock which is incremented
 * on local changes. This allows proper conflict detection when changes happen
 * on multiple devices simultaneously.
 */
export class SyncService<const MD extends ModelCfgs> {
  public readonly IS_DO_CROSS_MODEL_MIGRATIONS: boolean;
  private static readonly UPDATE_ALL_REV = 'UPDATE_ALL_REV';
  private static readonly L = 'SyncService';

  private _metaFileSyncService: MetaSyncService;
  private _modelSyncService: ModelSyncService<MD>;

  constructor(
    public m: ModelCfgToModelCtrl<MD>,
    private _pfapiMain: Pfapi<MD>,
    private _metaModelCtrl: MetaModelCtrl,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<SyncProviderId> | null>,
    _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
    _encryptAndCompressHandler: EncryptAndCompressHandlerService,
  ) {
    this._metaFileSyncService = new MetaSyncService(
      _metaModelCtrl,
      _currentSyncProvider$,
      _encryptAndCompressHandler,
      _encryptAndCompressCfg$,
    );
    this._modelSyncService = new ModelSyncService(
      m,
      _pfapiMain,
      _currentSyncProvider$,
      _encryptAndCompressHandler,
      _encryptAndCompressCfg$,
    );

    this.IS_DO_CROSS_MODEL_MIGRATIONS = !!(
      _pfapiMain.cfg?.crossModelVersion &&
      _pfapiMain.cfg?.crossModelMigrations &&
      Object.keys(_pfapiMain.cfg?.crossModelMigrations).length
    );
  }

  /**
   * Synchronizes data between local and remote storage
   * Determines sync direction based on timestamps and data state
   * @returns Promise containing sync status and optional conflict data
   */
  async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }> {
    try {
      if (!(await this._isReadyForSync())) {
        return { status: SyncStatus.NotConfigured };
      }
      const localMeta0 = await this._metaModelCtrl.load();

      PFLog.normal(`${SyncService.L}.${this.sync.name}(): Initial meta check`, {
        lastUpdate: localMeta0.lastUpdate,
        lastSyncedUpdate: localMeta0.lastSyncedUpdate,
        metaRev: localMeta0.metaRev,
        isInSync: localMeta0.lastSyncedUpdate === localMeta0.lastUpdate,
      });

      // Quick pre-check for all synced
      if (localMeta0.lastSyncedUpdate === localMeta0.lastUpdate) {
        const metaRev = await this._metaFileSyncService.getRev(localMeta0.metaRev);
        if (metaRev === localMeta0.metaRev) {
          PFLog.normal(
            `${SyncService.L}.${this.sync.name}(): Early return - already in sync`,
          );
          return { status: SyncStatus.InSync };
        }
      }

      const { remoteMeta, remoteMetaRev } = await this._metaFileSyncService.download();

      // we load again, to get the latest local changes for our checks and the data to upload
      const localMeta = await this._metaModelCtrl.load();

      const { status, conflictData } = getSyncStatusFromMetaFiles(remoteMeta, localMeta);

      PFLog.normal(
        `${SyncService.L}.${this.sync.name}(): __SYNC_START__ metaFileCheck`,
        status,
        {
          l: localMeta.lastUpdate && new Date(localMeta.lastUpdate).toISOString(),
          r: remoteMeta.lastUpdate && new Date(remoteMeta.lastUpdate).toISOString(),
          remoteMetaFileContent: remoteMeta,
          localSyncMetaData: localMeta,
          remoteMetaRev,
        },
      );

      switch (status) {
        case SyncStatus.UpdateLocal:
          // Emit event before updating local data
          try {
            const currentBackup = await this._pfapiMain.loadCompleteBackup();

            // Get the models that will be updated
            const { toUpdate } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
              revMapNewer: remoteMeta.revMap,
              revMapToOverwrite: localMeta.revMap,
              errorContext: 'DOWNLOAD',
            });

            this._pfapiMain.ev.emit('onBeforeUpdateLocal', {
              backup: currentBackup,
              modelsToUpdate: toUpdate,
            });
          } catch (error) {
            PFLog.critical('Failed to emit onBeforeUpdateLocal event', error);
            // Continue with sync even if backup event fails
          }

          if (this.IS_DO_CROSS_MODEL_MIGRATIONS) {
            const mvcR = modelVersionCheck({
              // TODO check for problems
              clientVersion:
                this._pfapiMain.cfg?.crossModelVersion || localMeta.crossModelVersion,
              toImport: remoteMeta.crossModelVersion,
            });
            switch (mvcR) {
              case ModelVersionCheckResult.MinorUpdate:
              case ModelVersionCheckResult.MajorUpdate:
                PFLog.normal('Downloading all since model version changed');
                await this.downloadAll();
                return { status: SyncStatus.UpdateLocalAll };
              case ModelVersionCheckResult.RemoteMajorAhead:
                throw new ModelVersionToImportNewerThanLocalError({
                  localMeta,
                  remoteMeta,
                });
              // NOTE case ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly is fallthrough
            }
          }
          // NOTE: also fallthrough for case ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly:
          await this.downloadToLocal(remoteMeta, localMeta, remoteMetaRev);
          return { status };

        case SyncStatus.UpdateRemote:
          await this.uploadToRemote(remoteMeta, localMeta, remoteMetaRev);
          return { status };
        case SyncStatus.InSync:
          // Ensure lastSyncedUpdate is set even when already in sync
          if (localMeta.lastSyncedUpdate !== localMeta.lastUpdate) {
            PFLog.normal('InSync but lastSyncedUpdate needs update', {
              lastSyncedUpdate: localMeta.lastSyncedUpdate,
              lastUpdate: localMeta.lastUpdate,
            });

            // Get the local vector clock
            const localVector = localMeta.vectorClock;

            const updatedMeta = {
              ...localMeta,
              lastSyncedUpdate: localMeta.lastUpdate,
              metaRev: remoteMetaRev,
              // Ensure vector clock fields are always present
              vectorClock: localMeta.vectorClock || {},
              lastSyncedVectorClock: localVector || null,
            };

            await this._metaFileSyncService.saveLocal(updatedMeta);
          }
          return { status };
        case SyncStatus.Conflict:
          return { status, conflictData };
        case SyncStatus.IncompleteRemoteData:
          return { status, conflictData };
        default:
          // likely will never happen
          throw new UnknownSyncStateError();
      }
    } catch (e) {
      PFLog.critical(`${SyncService.L}.${this.sync.name}(): Sync error`, e);

      if (e instanceof NoRemoteMetaFile) {
        PFLog.critical('No remote meta file found, uploading all data');
        // if there is no remote meta file, we need to upload all data
        await this.uploadAll(true);
        return { status: SyncStatus.UpdateRemoteAll };
      }

      // This indicates an incomplete sync, retry upload
      if (e instanceof LockFromLocalClientPresentError) {
        PFLog.critical('Lock from local client present, forcing upload of all data');
        await this.uploadAll(true);
        return { status: SyncStatus.UpdateRemoteAll };
      }
      throw e;
    }
  }

  /**
   * Uploads all local data to remote storage
   * @param isForceUpload Whether to force upload even if lock exists
   */
  async uploadAll(isForceUpload: boolean = false): Promise<void> {
    PFLog.normal(
      `${SyncService.L}.${this.uploadAll.name}(): Uploading all data to remote, force=${isForceUpload}`,
    );

    // we need to check meta file for being in locked mode
    if (!isForceUpload) {
      await this._metaFileSyncService.download();
    }

    let local = await this._metaModelCtrl.load();
    if (isForceUpload) {
      // Get client ID for vector clock operations
      const clientId = await this._metaModelCtrl.loadClientId();
      let localVector = local.vectorClock || {};

      // For conflict resolution, fetch remote metadata once and handle vector clocks
      let remoteMeta: RemoteMeta | null = null;

      try {
        const result = await this._metaFileSyncService.download();
        remoteMeta = result.remoteMeta;
      } catch (e) {
        PFLog.error('Warning: Cannot fetch remote metadata during force upload', e);
      }

      // Merge vector clocks if remote metadata was successfully fetched
      if (remoteMeta && remoteMeta.vectorClock) {
        let remoteVector = remoteMeta.vectorClock;
        // Sanitize remote vector clock before merging
        remoteVector = sanitizeVectorClock(remoteVector);
        localVector = mergeVectorClocks(localVector, remoteVector);
        PFLog.normal('Merged remote vector clock for force upload', {
          localOriginal: local.vectorClock,
          remote: remoteVector,
          merged: localVector,
        });
      } else {
        PFLog.error('Proceeding with force upload without remote vector clock merge');
      }

      let newVector = incrementVectorClock(localVector, clientId);

      // Apply size limiting to prevent unbounded growth
      newVector = limitVectorClockSize(newVector, clientId);

      const updatedMeta = {
        ...local,
        lastUpdate: Date.now(),
        vectorClock: newVector,
      };

      await this._metaModelCtrl.save(
        updatedMeta,
        // NOTE we always ignore db lock while syncing
        true,
      );
      local = await this._metaModelCtrl.load();
    }

    try {
      // Get the local vector clock
      const localVector = local.vectorClock;

      return await this.uploadToRemote(
        {
          crossModelVersion: local.crossModelVersion,
          lastUpdate: local.lastUpdate,
          revMap: {},
          // Will be assigned later
          mainModelData: {},
          vectorClock: localVector,
        },
        {
          ...local,
          revMap: this._fakeFullRevMap(),
          // Ensure lastSyncedUpdate matches lastUpdate to prevent false conflicts
          lastSyncedUpdate: local.lastUpdate,
        },
        null,
      );
    } catch (e) {
      if (e instanceof LockFromLocalClientPresentError) {
        PFLog.critical(
          'Lock from local client detected during uploadAll, forcing upload',
        );
        return await this.uploadAll(true);
      }
      throw e;
    }
  }

  /**
   * Downloads all data from remote storage to local
   * @param isSkipModelRevMapCheck Whether to skip revision map checks
   */
  async downloadAll(isSkipModelRevMapCheck: boolean = false): Promise<void> {
    PFLog.normal(
      `${SyncService.L}.${this.downloadAll.name}(): Downloading all data from remote`,
    );

    const local = await this._metaModelCtrl.load();
    const { remoteMeta, remoteMetaRev } = await this._metaFileSyncService.download();
    const fakeLocal: LocalMeta = {
      // We still need local modelVersions here as they contain latest model versions for migrations
      crossModelVersion: local.crossModelVersion,
      lastUpdate: 1,
      lastSyncedUpdate: null,
      metaRev: null,
      revMap: {},
      // Include vector clock fields to prevent comparison issues
      vectorClock: {},
      lastSyncedVectorClock: null,
    };

    return await this.downloadToLocal(
      remoteMeta,
      fakeLocal,
      remoteMetaRev,
      isSkipModelRevMapCheck,
      true,
    );
  }

  /**
   * Downloads data from remote to local storage
   * @param remote Remote metadata
   * @param local Local metadata
   * @param remoteRev Remote revision
   * @param isSkipModelRevMapCheck Whether to skip revision map checks
   * @param isDownloadAll Whether attempting to download all the data
   */
  async downloadToLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipModelRevMapCheck: boolean = false,
    isDownloadAll: boolean = false,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      errorContext: 'DOWNLOAD',
    });

    PFLog.normal(`${SyncService.L}.${this.downloadToLocal.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      remoteRev,
      toUpdate,
      toDelete,
      isDownloadAll,
    });

    // If nothing to update or provider limited to single file sync
    if (
      (!isDownloadAll && toUpdate.length === 0 && toDelete.length === 0) ||
      this._currentSyncProvider$.getOrError().isLimitedToSingleFileSync
    ) {
      await this._modelSyncService.updateLocalMainModelsFromRemoteMetaFile(remote);
      PFLog.verbose('RevMap comparison', {
        isEqual: JSON.stringify(remote.revMap) === JSON.stringify(local.revMap),
        remoteRevMap: remote.revMap,
        localRevMap: local.revMap,
      });

      // Get client ID for vector clock operations
      const clientId = await this._metaModelCtrl.loadClientId();

      // Merge vector clocks if available
      const localVector = sanitizeVectorClock(getVectorClock(local, clientId) || {});
      const remoteVector = sanitizeVectorClock(getVectorClock(remote, clientId) || {});
      let mergedVector = mergeVectorClocks(localVector, remoteVector);

      // Apply size limiting after merge
      if (mergedVector) {
        mergedVector = limitVectorClockSize(mergedVector, clientId);
      }

      const updatedMeta = {
        // shared
        lastUpdate: remote.lastUpdate,
        crossModelVersion: remote.crossModelVersion,
        revMap: remote.revMap,
        // local meta
        lastSyncedUpdate: remote.lastUpdate,
        metaRev: remoteRev,
        // Always include vector clock fields to prevent them from being lost
        vectorClock: mergedVector || local.vectorClock || remote.vectorClock || {},
        lastSyncedVectorClock:
          mergedVector || local.vectorClock || remote.vectorClock || {},
      };

      await this._metaFileSyncService.saveLocal(updatedMeta);
      return;
    }

    return this._downloadToLocalMULTI(
      remote,
      local,
      remoteRev,
      isSkipModelRevMapCheck,
      isDownloadAll,
    );
  }

  /**
   * Multi-file download implementation
   * Downloads multiple models in parallel with load balancing
   */
  async _downloadToLocalMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipModelRevMapCheck: boolean = false,
    isDownloadAll: boolean = false,
  ): Promise<void> {
    PFLog.normal(`${SyncService.L}.${this._downloadToLocalMULTI.name}()`, {
      remote,
      local,
      remoteRev,
      isSkipModelRevMapCheck,
      isDownloadAll,
    });

    const { toUpdate, toDelete } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      errorContext: 'DOWNLOAD',
    });

    const dataMap: { [key: string]: unknown } = {};
    const realRemoteRevMap: RevMap = {};

    const downloadModelFns = toUpdate.map(
      (modelId) => () =>
        this._modelSyncService
          .download(modelId, isSkipModelRevMapCheck ? null : remote.revMap[modelId])
          .then(({ rev, data }) => {
            if (typeof rev !== 'string') {
              throw new ImpossibleError('No rev found for modelId: ' + modelId);
            }
            realRemoteRevMap[modelId] = rev;
            dataMap[modelId] = data;
          }),
    );

    await loadBalancer(
      downloadModelFns,
      this._currentSyncProvider$.getOrError().maxConcurrentRequests,
    );

    if (isDownloadAll) {
      const fullData = { ...dataMap, ...remote.mainModelData } as any;
      PFLog.normal(`${SyncService.L}.${this._downloadToLocalMULTI.name}()`, {
        fullData,
        dataMap,
        realRemoteRevMap,
        toUpdate,
      });
      await this._pfapiMain.importAllSycModelData({
        data: fullData,
        crossModelVersion: remote.crossModelVersion,
        isAttemptRepair: true,
        isBackupData: true,
        isSkipLegacyWarnings: false,
      });
    } else {
      await this._modelSyncService.updateLocalUpdated(toUpdate, toDelete, dataMap);
      await this._modelSyncService.updateLocalMainModelsFromRemoteMetaFile(remote);
    }

    // Get client ID for vector clock operations
    const clientId = await this._metaModelCtrl.loadClientId();

    // Merge vector clocks if available
    const localVector = sanitizeVectorClock(getVectorClock(local, clientId) || {});
    const remoteVector = sanitizeVectorClock(getVectorClock(remote, clientId) || {});
    let mergedVector = mergeVectorClocks(localVector, remoteVector);

    // Apply size limiting after merge
    if (mergedVector) {
      mergedVector = limitVectorClockSize(mergedVector, clientId);
    }

    const updatedMeta = {
      metaRev: remoteRev,
      lastSyncedUpdate: remote.lastUpdate,
      lastUpdate: remote.lastUpdate,
      lastSyncedAction: `Downloaded ${isDownloadAll ? 'all data' : `${toUpdate.length} models`} at ${new Date().toISOString()}`,
      revMap: validateRevMap({
        ...local.revMap,
        ...realRemoteRevMap,
      }),
      crossModelVersion: remote.crossModelVersion,
      // Always include vector clock fields to prevent them from being lost
      vectorClock: mergedVector || local.vectorClock || remote.vectorClock || {},
      lastSyncedVectorClock:
        mergedVector || local.vectorClock || remote.vectorClock || {},
    };

    await this._metaFileSyncService.saveLocal(updatedMeta);
  }

  /**
   * Uploads local changes to remote storage
   * @param remote Remote metadata
   * @param local Local metadata
   * @param lastRemoteRev Last known remote revision
   */
  async uploadToRemote(
    remote: RemoteMeta,
    local: LocalMeta,
    lastRemoteRev: string | null,
  ): Promise<void> {
    PFLog.normal(`${SyncService.L}.${this.uploadToRemote.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });

    const { toUpdate, toDelete } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      errorContext: 'UPLOAD',
    });

    // For single file sync or when nothing to update
    if (
      (toUpdate.length === 0 && toDelete.length === 0) ||
      this._currentSyncProvider$.getOrError().isLimitedToSingleFileSync
    ) {
      const syncProvider = this._currentSyncProvider$.getOrError();
      const mainModelData = syncProvider.isLimitedToSingleFileSync
        ? await this._pfapiMain.getAllSyncModelData()
        : await this._modelSyncService.getMainFileModelDataForUpload();

      const uploadMeta: UploadMeta = {
        revMap: local.revMap,
        lastUpdate: local.lastUpdate,
        lastUpdateAction: local.lastUpdateAction,
        crossModelVersion: local.crossModelVersion,
        mainModelData,
        vectorClock: local.vectorClock,
        ...(syncProvider.isLimitedToSingleFileSync ? { isFullData: true } : {}),
      };

      const metaRevAfterUpdate = await this._metaFileSyncService.upload(
        uploadMeta,
        lastRemoteRev,
      );

      // Update local after successful upload
      PFLog.normal(
        `${SyncService.L}.${this.uploadToRemote.name}(): Updating local metadata after upload`,
        {
          localLastUpdate: local.lastUpdate,
          localLastSyncedUpdate: local.lastSyncedUpdate,
          willSetLastSyncedUpdate: local.lastUpdate,
          metaRevAfterUpdate,
        },
      );

      const updatedMeta = {
        ...local,
        lastSyncedUpdate: local.lastUpdate,
        lastSyncedAction: `Uploaded single file at ${new Date().toISOString()}`,
        metaRev: metaRevAfterUpdate,
        lastSyncedVectorClock: local.vectorClock || null,
      };

      await this._metaFileSyncService.saveLocal(updatedMeta);

      PFLog.normal(
        `${SyncService.L}.${this.uploadToRemote.name}(): Local metadata updated successfully`,
      );
      return;
    }

    return this._uploadToRemoteMULTI(remote, local, lastRemoteRev);
  }

  /**
   * Multi-file upload implementation
   * Uploads multiple models in parallel with load balancing
   * @param remote Remote metadata
   * @param local Local metadata
   * @param remoteMetaRev Remote metadata revision
   */
  async _uploadToRemoteMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteMetaRev: string | null,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      errorContext: 'UPLOAD',
    });

    PFLog.normal(`${SyncService.L}.${this._uploadToRemoteMULTI.name}()`, {
      toUpdate,
      toDelete,
      remote,
      local,
    });

    const realRevMap: RevMap = {
      ...local.revMap,
    };
    const completeData = await this._pfapiMain.getAllSyncModelData();

    // Lock meta file during multi-file upload to prevent concurrent modifications
    await this._metaFileSyncService.lock(remoteMetaRev);

    const syncProvider = this._currentSyncProvider$.getOrError();
    const maxConcurrentRequests = syncProvider.maxConcurrentRequests;

    // Create functions for updates and deletions
    const uploadModelFns = toUpdate.map(
      (modelId) => () =>
        this._modelSyncService.upload(modelId, completeData[modelId]).then((rev) => {
          realRevMap[modelId] = cleanRev(rev);
        }),
    );
    const toDeleteFns = toDelete.map(
      (modelId) => () => this._modelSyncService.remove(modelId),
    );

    // Execute operations with load balancing
    await loadBalancer([...uploadModelFns, ...toDeleteFns], maxConcurrentRequests);

    PFLog.verbose('Final revMap after uploads', realRevMap);

    // Validate and upload the final revMap
    const validatedRevMap = validateRevMap(realRevMap);

    const uploadMeta: UploadMeta = {
      revMap: validatedRevMap,
      lastUpdate: local.lastUpdate,
      lastUpdateAction: local.lastUpdateAction,
      crossModelVersion: local.crossModelVersion,
      mainModelData:
        await this._modelSyncService.getMainFileModelDataForUpload(completeData),
      vectorClock: local.vectorClock,
    };

    const metaRevAfterUpload = await this._metaFileSyncService.upload(uploadMeta);

    // Update local after successful upload
    const updatedMeta = {
      // leave as is basically
      lastUpdate: local.lastUpdate,
      crossModelVersion: local.crossModelVersion,
      // Always include vector clock fields to prevent them from being lost
      vectorClock: local.vectorClock || {},
      lastSyncedVectorClock: local.vectorClock || null,

      // actual updates
      lastSyncedUpdate: local.lastUpdate,
      lastSyncedAction: `Uploaded ${toUpdate.length} models at ${new Date().toISOString()}`,
      revMap: validatedRevMap,
      metaRev: metaRevAfterUpload,
    };

    await this._metaFileSyncService.saveLocal(updatedMeta);
  }

  /**
   * Checks if the sync provider is ready for synchronization
   * @returns Promise resolving to boolean indicating readiness
   */
  private async _isReadyForSync(): Promise<boolean> {
    return this._currentSyncProvider$.getOrError().isReady();
  }

  /**
   * Creates a fake full revision map for all models
   * Used when uploading all data
   * @returns RevMap with fake revisions for all models
   */
  private _fakeFullRevMap(): RevMap {
    const revMap: RevMap = {};
    this._allModelIds().forEach((modelId) => {
      if (!this.m[modelId].modelCfg.isMainFileModel) {
        revMap[modelId] = SyncService.UPDATE_ALL_REV;
      }
    });
    return revMap;
  }

  /**
   * Returns all model IDs from the configuration
   * @returns Array of model IDs
   */
  private _allModelIds(): string[] {
    return Object.keys(this.m);
  }
}
