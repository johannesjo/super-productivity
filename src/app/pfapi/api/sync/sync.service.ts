import {
  ConflictData,
  EncryptAndCompressCfg,
  LocalMeta,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
} from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import { SyncStatus } from '../pfapi.const';
import {
  ImpossibleError,
  LockFromLocalClientPresentError,
  ModelVersionToImportNewerThanLocalError,
  NoRemoteMetaFile,
  UnknownSyncStateError,
} from '../errors/errors';
import { pfLog } from '../util/log';
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
import { MigrationService } from '../migration/migration.service';

export class SyncService<const MD extends ModelCfgs> {
  public readonly IS_DO_CROSS_MODEL_MIGRATIONS: boolean;
  private static readonly UPDATE_ALL_REV = 'UPDATE_ALL_REV';
  private _metaFileSyncService: MetaSyncService;
  private _modelSyncService: ModelSyncService<MD>;

  constructor(
    public m: ModelCfgToModelCtrl<MD>,
    private _pfapiMain: Pfapi<MD>,
    private _migrationService: MigrationService<MD>,
    private _metaModelCtrl: MetaModelCtrl,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
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
   */
  async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }> {
    try {
      if (!(await this._isReadyForSync())) {
        return { status: SyncStatus.NotConfigured };
      }
      const localMeta0 = await this._metaModelCtrl.load();

      // Quick pre-check for all synced
      if (localMeta0.lastSyncedUpdate === localMeta0.lastUpdate) {
        const metaRev = await this._metaFileSyncService.getRev(localMeta0.metaRev);
        if (metaRev === localMeta0.metaRev) {
          return { status: SyncStatus.InSync };
        }
      }

      const { remoteMeta, remoteMetaRev } = await this._metaFileSyncService.download(
        localMeta0.metaRev,
      );

      // we load again, to get the latest local changes for our checks and the data to upload
      const localMeta = await this._metaModelCtrl.load();

      const { status, conflictData } = getSyncStatusFromMetaFiles(remoteMeta, localMeta);

      pfLog(
        2,
        `${SyncService.name}.${this.sync.name}(): __SYNC_START__ metaFileCheck`,
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
          if (this.IS_DO_CROSS_MODEL_MIGRATIONS) {
            const mcr = modelVersionCheck({
              // TODO check for problems
              clientVersion:
                this._pfapiMain.cfg?.crossModelVersion || localMeta.crossModelVersion,
              toImport: remoteMeta.crossModelVersion,
            });
            switch (mcr) {
              case ModelVersionCheckResult.MinorUpdate:
              case ModelVersionCheckResult.MajorUpdate:
                alert('Downloading all since cross model version changed');
                await this.downloadAll();
                // TODO could be more efficient by migrating before importing into database
                await this._migrationService.checkAndMigrateLocalDB();
                return { status: SyncStatus.UpdateLocalAll };

              case ModelVersionCheckResult.RemoteMajorAhead:
                throw new ModelVersionToImportNewerThanLocalError({
                  localMeta,
                  remoteMeta,
                });
            }
          }
          // NOTE: also fallthrough for case ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly:
          await this.downloadToLocal(remoteMeta, localMeta, remoteMetaRev);
          return { status };

        case SyncStatus.UpdateRemote:
          await this.uploadToRemote(remoteMeta, localMeta, remoteMetaRev);
          return { status };
        case SyncStatus.InSync:
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
      pfLog(0, `${SyncService.name}.${this.sync.name}(): Sync error`, e);

      if (e instanceof NoRemoteMetaFile) {
        pfLog(0, 'No remote meta file found, uploading all data');
        // if there is no remote meta file, we need to upload all data
        await this.uploadAll(true);
        return { status: SyncStatus.UpdateRemoteAll };
      }

      // This indicates an incomplete sync, retry upload
      if (e instanceof LockFromLocalClientPresentError) {
        alert('CATCH LockFileFromLocalClientPresentError 1');
        pfLog(0, 'Lock from local client present, forcing upload of all data');
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
    pfLog(
      2,
      `${SyncService.name}.${this.uploadAll.name}(): Uploading all data to remote, force=${isForceUpload}`,
    );

    alert('UPLOAD ALL TO REMOTE f' + isForceUpload);
    // we need to check meta file for being in locked mode
    if (!isForceUpload) {
      await this._metaFileSyncService.download();
    }

    let local = await this._metaModelCtrl.load();
    if (isForceUpload) {
      // Change lastUpdate timestamp to indicate a newer revision to other clients
      await this._metaModelCtrl.save({
        ...local,
        lastUpdate: Date.now(),
      });
      local = await this._metaModelCtrl.load();
    }

    try {
      return await this.uploadToRemote(
        {
          modelVersions: local.modelVersions,
          crossModelVersion: local.crossModelVersion,
          lastUpdate: local.lastUpdate,
          revMap: {},
          // Will be assigned later
          mainModelData: {},
        },
        { ...local, revMap: this._fakeFullRevMap() },
        null,
      );
    } catch (e) {
      if (e instanceof LockFromLocalClientPresentError) {
        pfLog(0, 'Lock from local client detected during uploadAll, forcing upload');
        alert('CATCH LockFileFromLocalClientPresentError 2 FORCE UPLOAD');
        return await this.uploadAll(true);
      }
      throw e;
    }
  }

  async downloadAll(isSkipModelRevMapCheck: boolean = false): Promise<void> {
    alert('DOWNLOAD ALL TO LOCAL');
    pfLog(
      2,
      `${SyncService.name}.${this.downloadAll.name}(): Downloading all data from remote`,
    );

    const local = await this._metaModelCtrl.load();
    const { remoteMeta, remoteMetaRev } = await this._metaFileSyncService.download();
    const fakeLocal: LocalMeta = {
      // We still need local modelVersions here as they contain latest model versions for migrations
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      lastUpdate: 1,
      lastSyncedUpdate: null,
      metaRev: null,
      revMap: {},
    };

    return await this.downloadToLocal(
      remoteMeta,
      fakeLocal,
      remoteMetaRev,
      isSkipModelRevMapCheck,
    );
  }

  /**
   * Downloads data from remote to local storage
   */
  async downloadToLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipModelRevMapCheck: boolean = false,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._modelSyncService.getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      errorContext: 'DOWNLOAD',
    });

    pfLog(2, `${SyncService.name}.${this.downloadToLocal.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      remoteRev,
      toUpdate,
      toDelete,
    });

    // If nothing to update or provider limited to single file sync
    if (
      (toUpdate.length === 0 && toDelete.length === 0) ||
      this._currentSyncProvider$.getOrError().isLimitedToSingleFileSync
    ) {
      await this._modelSyncService.updateLocalFromRemoteMetaFile(remote);
      pfLog(3, 'RevMap comparison', {
        isEqual: JSON.stringify(remote.revMap) === JSON.stringify(local.revMap),
        remoteRevMap: remote.revMap,
        localRevMap: local.revMap,
      });

      await this._metaFileSyncService.saveLocal({
        // shared
        lastUpdate: remote.lastUpdate,
        crossModelVersion: remote.crossModelVersion,
        modelVersions: remote.modelVersions,
        revMap: remote.revMap,
        // local meta
        lastSyncedUpdate: remote.lastUpdate,
        metaRev: remoteRev,
      });
      return;
    }

    // TODO make rev change to see if there were updates before lock file maybe
    return this._downloadToLocalMULTI(remote, local, remoteRev, isSkipModelRevMapCheck);
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
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._downloadToLocalMULTI.name}()`, {
      remote,
      local,
      remoteRev,
      isSkipModelRevMapCheck,
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

    await this._modelSyncService.updateLocalUpdated(toUpdate, toDelete, dataMap);

    // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
    // since remote might hava an incomplete update

    // ON SUCCESS
    await this._modelSyncService.updateLocalFromRemoteMetaFile(remote);

    await this._metaFileSyncService.saveLocal({
      metaRev: remoteRev,
      lastSyncedUpdate: remote.lastUpdate,
      lastUpdate: remote.lastUpdate,
      // TODO check if we need to extend the revMap and modelVersions???
      revMap: validateRevMap({
        ...local.revMap,
        ...realRemoteRevMap,
      }),
      modelVersions: remote.modelVersions,
      crossModelVersion: remote.crossModelVersion,
    });
  }

  /**
   * Uploads local changes to remote storage
   */
  async uploadToRemote(
    remote: RemoteMeta,
    local: LocalMeta,
    lastRemoteRev: string | null,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this.uploadToRemote.name}()`, {
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
      const mainModelData = this._currentSyncProvider$.getOrError()
        .isLimitedToSingleFileSync
        ? await this._pfapiMain.getAllSyncModelData()
        : await this._modelSyncService.getMainFileModelDataForUpload();

      const metaRevAfterUpdate = await this._metaFileSyncService.upload(
        {
          revMap: local.revMap,
          lastUpdate: local.lastUpdate,
          crossModelVersion: local.crossModelVersion,
          modelVersions: local.modelVersions,
          mainModelData,
          ...(this._currentSyncProvider$.getOrError().isLimitedToSingleFileSync
            ? { isFullData: true }
            : {}),
        },
        lastRemoteRev,
      );

      // Update local after successful upload
      await this._metaFileSyncService.saveLocal({
        ...local,
        lastSyncedUpdate: local.lastUpdate,
        metaRev: metaRevAfterUpdate,
      });
      return;
    }

    // TODO maybe make rev check for meta file to see if there were updates before lock file maybe
    return this._uploadToRemoteMULTI(remote, local, lastRemoteRev);
  }

  /**
   * Multi-file upload implementation
   * Uploads multiple models in parallel with load balancing
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

    pfLog(2, `${SyncService.name}.${this._uploadToRemoteMULTI.name}()`, {
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
    await loadBalancer(
      [...uploadModelFns, ...toDeleteFns],
      this._currentSyncProvider$.getOrError().maxConcurrentRequests,
    );

    pfLog(3, 'Final revMap after uploads', realRevMap);

    // Validate and upload the final revMap
    const validatedRevMap = validateRevMap(realRevMap);
    const metaRevAfterUpload = await this._metaFileSyncService.upload({
      revMap: validatedRevMap,
      lastUpdate: local.lastUpdate,
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      mainModelData:
        await this._modelSyncService.getMainFileModelDataForUpload(completeData),
    });

    // Update local after successful upload
    await this._metaFileSyncService.saveLocal({
      // leave as is basically
      lastUpdate: local.lastUpdate,
      modelVersions: local.modelVersions,
      crossModelVersion: local.crossModelVersion,

      // actual updates
      lastSyncedUpdate: local.lastUpdate,
      revMap: validatedRevMap,
      metaRev: metaRevAfterUpload,
    });
  }

  /**
   * Checks if the sync provider is ready for synchronization
   */
  private _isReadyForSync(): Promise<boolean> {
    return this._currentSyncProvider$.getOrError().isReady();
  }

  /**
   * Creates a fake full revision map for all models
   * Used when uploading all data
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
   */
  private _allModelIds(): string[] {
    return Object.keys(this.m);
  }
}
