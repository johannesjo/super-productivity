import {
  AllSyncModels,
  ConflictData,
  EncryptAndCompressCfg,
  LocalMeta,
  MainModelData,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
} from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import { SyncStatus } from '../pfapi.const';
import {
  CannotGetEncryptAndCompressCfg,
  LockFileFromLocalClientPresentError,
  LockFilePresentError,
  ModelVersionToImportNewerThanLocalError,
  NoRemoteMetaFile,
  NoSyncProviderSetError,
  RemoteFileNotFoundAPIError,
  RevMapModelMismatchErrorOnDownload,
  RevMapModelMismatchErrorOnUpload,
  RevMismatchError,
  UnknownSyncStateError,
} from '../errors/errors';
import { pfLog } from '../util/log';
import { MetaModelCtrl } from '../model-ctrl/meta-model-ctrl';
import { EncryptAndCompressHandlerService } from './encrypt-and-compress-handler.service';
import { cleanRev } from '../util/clean-rev';
import { getModelIdsToUpdateFromRevMaps } from '../util/get-model-ids-to-update-from-rev-maps';
import { getSyncStatusFromMetaFiles } from '../util/get-sync-status-from-meta-files';
import { validateMetaBase } from '../util/validate-meta-base';
import { validateRevMap } from '../util/validate-rev-map';
import { loadBalancer } from '../util/load-balancer';
import { Pfapi } from '../pfapi';
import { modelVersionCheck, ModelVersionCheckResult } from '../util/model-version-check';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class SyncService<const MD extends ModelCfgs> {
  public readonly IS_DO_CROSS_MODEL_MIGRATIONS: boolean;

  constructor(
    public m: ModelCfgToModelCtrl<MD>,
    private _pfapiMain: Pfapi<MD>,
    private _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    private _encryptAndCompressCfg$: MiniObservable<EncryptAndCompressCfg>,
    private _metaModelCtrl: MetaModelCtrl,
    private _encryptAndCompressHandler: EncryptAndCompressHandlerService,
  ) {
    this.IS_DO_CROSS_MODEL_MIGRATIONS = !!(
      _pfapiMain.cfg?.crossModelVersion &&
      _pfapiMain.cfg?.crossModelMigrations &&
      Object.keys(_pfapiMain.cfg?.crossModelMigrations).length
    );
  }

  async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }> {
    try {
      if (!(await this._isReadyForSync())) {
        return { status: SyncStatus.NotConfigured };
      }
      const localMeta0 = await this._metaModelCtrl.loadMetaModel();

      // quick pre-check for all synced
      if (localMeta0.lastSyncedUpdate === localMeta0.lastUpdate) {
        const metaRev = await this._getMetaRev(localMeta0.metaRev);
        if (metaRev === localMeta0.metaRev) {
          return { status: SyncStatus.InSync };
        }
      }

      const { remoteMeta, remoteMetaRev } = await this._downloadMetaFile(
        localMeta0.metaRev,
      );

      // we load again, to get the latest local changes for our checks and the data to upload
      const localMeta = await this._metaModelCtrl.loadMetaModel();

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
                throw new Error('NOT IMPLEMENTED');
              // TODO implement complete download of all (!! not just changed models)
              // return { status: SyncStatus.UpdateLocalAll };

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
      pfLog(1, `${SyncService.name}.${this.sync.name}()`, e);
      alert(e);
      if (e instanceof NoRemoteMetaFile) {
        // if there is no remote meta file, we need to upload all data
        await this.uploadAll();
        return { status: SyncStatus.UpdateRemoteAll };
      }

      // this indicates an incomplete sync, so we need to retry to upload all data
      if (e instanceof LockFileFromLocalClientPresentError) {
        alert('CATCH LockFileFromLocalClientPresentError 1');
        await this.uploadAll();
        return { status: SyncStatus.UpdateRemoteAll };
      }
      console.error(e);
      throw e;
    }
  }

  // --------------------------------------------------
  async uploadAll(isForceUpload: boolean = false): Promise<void> {
    alert('UPLOAD ALL TO REMOTE');
    // we need to check meta file for being in locked mode
    if (!isForceUpload) {
      await this._downloadMetaFile();
    }

    const local = await this._metaModelCtrl.loadMetaModel();
    try {
      return await this.uploadToRemote(
        {
          modelVersions: local.modelVersions,
          crossModelVersion: local.crossModelVersion,
          lastUpdate: local.lastUpdate,
          revMap: {},
          // NOTE: will be assigned later
          mainModelData: {},
        },
        { ...local, revMap: this._fakeFullRevMap() },
        null,
      );
    } catch (e) {
      if (e instanceof LockFileFromLocalClientPresentError) {
        alert('CATCH LockFileFromLocalClientPresentError 2 FORCE UPLOAD');
        return await this.uploadAll(true);
      }
      throw e;
    }
  }

  async downloadAll(): Promise<void> {
    alert('DOWNLOAD ALL TO LOCAL');
    const local = await this._metaModelCtrl.loadMetaModel();
    const { remoteMeta, remoteMetaRev } = await this._downloadMetaFile();
    const fakeLocal: LocalMeta = {
      // NOTE: we still need to use local modelVersions here, since they contain the latest model versions for migrations
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      lastUpdate: 1,
      lastSyncedUpdate: null,
      metaRev: null,
      revMap: {},
    };
    return await this.downloadToLocal(remoteMeta, fakeLocal, remoteMetaRev);
  }

  // --------------------------------------------------
  // NOTE: Public for testing only
  async downloadToLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      context: 'DOWNLOAD',
    });

    pfLog(2, `${SyncService.name}.${this.downloadToLocal.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      remoteRev,
      toUpdate,
      toDelete,
    });

    if (toUpdate.length === 0 && toDelete.length === 0) {
      await this._updateLocalMainModels(remote);
      console.log('XXXXXXXXXXXXXXXXXXXXXXX', {
        isEqual: JSON.stringify(remote.revMap) === JSON.stringify(local.revMap),
        remoteRevMap: remote.revMap,
        localRevMap: local.revMap,
      });

      await this._saveLocalMetaFileContent({
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
    return this._downloadToLocalMULTI(remote, local, remoteRev);
  }

  async _downloadToLocalMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._downloadToLocalMULTI.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });

    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      context: 'DOWNLOAD',
    });

    const realRevMap: RevMap = {};
    const dataMap: { [key: string]: unknown } = {};

    const downloadModelFns = toUpdate.map(
      (modelId) => () =>
        this._downloadModel(modelId).then(({ rev, data }) => {
          if (typeof rev === 'string') {
            realRevMap[modelId] = rev;
            dataMap[modelId] = data;
          }
        }),
    );

    await loadBalancer(downloadModelFns, this._syncProviderOrError.maxConcurrentRequests);

    await this._updateLocalUpdatedModels(toUpdate, toDelete, dataMap);

    // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
    // since remote might hava an incomplete update

    // ON SUCCESS
    await this._updateLocalMainModels(remote);

    await this._saveLocalMetaFileContent({
      metaRev: remoteRev,
      lastSyncedUpdate: remote.lastUpdate,
      lastUpdate: remote.lastUpdate,
      // TODO check if we need to extend the revMap and modelVersions???
      revMap: validateRevMap({
        ...local.revMap,
        ...realRevMap,
      }),
      modelVersions: remote.modelVersions,
      crossModelVersion: remote.crossModelVersion,
    });
  }

  // ----------------------
  async uploadToRemote(
    remote: RemoteMeta,
    local: LocalMeta,
    lastRemoteRev: string | null,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this.uploadToRemote.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });

    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      context: 'UPLOAD',
    });

    if (toUpdate.length === 0 && toDelete.length === 0) {
      const mainModelData = await this._getMainFileModelData();

      const metaRevAfterUpdate = await this._uploadMetaFile(
        {
          revMap: local.revMap,
          lastUpdate: local.lastUpdate,
          crossModelVersion: local.crossModelVersion,
          modelVersions: local.modelVersions,
          mainModelData,
        },
        lastRemoteRev,
      );
      // ON AFTER SUCCESS
      await this._saveLocalMetaFileContent({
        ...local,
        lastSyncedUpdate: local.lastUpdate,
        metaRev: metaRevAfterUpdate,
      });
      return;
    }
    // TODO maybe make rev check for meta file to see if there were updates before lock file maybe
    return this._uploadToRemoteMULTI(remote, local, lastRemoteRev);
  }

  // NOTE: Public for testing only
  async _uploadToRemoteMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteMetaRev: string | null,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      context: 'UPLOAD',
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

    await this._lockRemoteMetaFile(remoteMetaRev);

    const uploadModelFns = toUpdate.map(
      (modelId) => () =>
        this._uploadModel(
          modelId,
          this._getModelVersion(modelId),
          completeData[modelId],
        ).then((rev) => {
          realRevMap[modelId] = cleanRev(rev);
        }),
      // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually,
      //  since remote might hava an incomplete update
    );
    // const toDeleteFns = toDelete.map((modelId) => () => this._removeModel(modelId));

    await loadBalancer(uploadModelFns, this._syncProviderOrError.maxConcurrentRequests);
    console.log({ realRevMap });

    const validatedRevMap = validateRevMap(realRevMap);
    const metaRevAfterUpdate = await this._uploadMetaFile({
      revMap: validatedRevMap,
      lastUpdate: local.lastUpdate,
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      mainModelData: await this._getMainFileModelData(completeData),
    });

    // ON AFTER SUCCESS
    await this._saveLocalMetaFileContent({
      // leave as is basically
      lastUpdate: local.lastUpdate,
      modelVersions: local.modelVersions,
      crossModelVersion: local.crossModelVersion,

      // actual updates
      lastSyncedUpdate: local.lastUpdate,
      revMap: validatedRevMap,
      metaRev: metaRevAfterUpdate,
    });
  }

  // --------------------------------------------------
  private _isReadyForSync(): Promise<boolean> {
    return this._syncProviderOrError.isReady();
  }

  private _getModelVersion(modelId: string): number {
    return this.m[modelId].modelCfg.modelVersion;
  }

  private get _syncProviderOrError(): SyncProviderServiceInterface<unknown> {
    const provider = this._currentSyncProvider$.value;
    if (!provider) {
      throw new NoSyncProviderSetError();
    }
    return provider;
  }

  private _getEncryptionAndCompressionSettings(): EncryptAndCompressCfg {
    const cfg = this._encryptAndCompressCfg$.value;
    if (!cfg) {
      throw new CannotGetEncryptAndCompressCfg();
    }
    return cfg;
  }

  private _getRemoteFilePathForModelId(modelId: string): string {
    return modelId;
  }

  // ------------------------------------------------
  private async _uploadModel(
    modelId: string,
    modelVersion: number,
    data: any,
    localRev: string | null = null,
  ): Promise<string> {
    pfLog(2, `${SyncService.name}.${this._uploadModel.name}()`, modelId, {
      modelVersion,
      data,
      localRev,
    });

    const target = this._getRemoteFilePathForModelId(modelId);
    const syncProvider = this._syncProviderOrError;
    const encryptedAndCompressedData = await this._compressAndeEncryptData(
      data,
      modelVersion,
    );
    return (
      await syncProvider.uploadFile(target, encryptedAndCompressedData, localRev, true)
    ).rev;
  }

  private async _downloadModel<T>(
    modelId: string,
    expectedRev: string | null = null,
  ): Promise<{ data: T; rev: string }> {
    pfLog(2, `${SyncService.name}.${this._downloadModel.name}()`, {
      modelId,
      expectedRev,
    });

    const syncProvider = this._syncProviderOrError;
    const { rev, dataStr } = await syncProvider.downloadFile(modelId, expectedRev);
    if (expectedRev) {
      if (!rev || !this._isSameRev(rev, expectedRev)) {
        throw new RevMismatchError(`Download Model Rev: ${modelId}`);
      }
    }
    // TODO maybe validate
    const data = await this._decompressAndDecryptData<T>(dataStr);
    return { data, rev };
  }

  private async _removeModel(modelId: string): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._removeModel.name}()`, {
      modelId,
    });

    const syncProvider = this._syncProviderOrError;
    await syncProvider.removeFile(modelId);
  }

  // --------------------------------------------------

  private async _updateLocalUpdatedModels(
    toUpdate: string[],
    toDelete: string[],
    dataMap: { [key: string]: unknown },
  ): Promise<unknown> {
    return await Promise.all([
      ...toUpdate.map((modelId) => this._updateLocalModel(modelId, dataMap[modelId])),
      // TODO delete local models
      // ...toDelete.map((id) => this._deleteLocalModel(id, 'aaa')),
    ]);
  }

  private async _updateLocalModel(modelId: string, modelData: unknown): Promise<void> {
    // TODO better typing
    await this.m[modelId].save(modelData as any);
  }

  // META MODEL
  // ----------
  private async _uploadMetaFile(
    meta: RemoteMeta,
    revToMatch: string | null = null,
  ): Promise<string> {
    const encryptedAndCompressedData = await this._compressAndeEncryptData(
      validateMetaBase(meta),
      meta.crossModelVersion,
    );
    if (encryptedAndCompressedData.length > 200000) {
      console.log('___________LAAARGE DATA UPLOAD');
      alert('LAAARGE DATA UPLOAD');
    }
    pfLog(2, `${SyncService.name}.${this._uploadMetaFile.name}()`, {
      meta,
      // encryptedAndCompressedData,
    });

    const syncProvider = this._syncProviderOrError;

    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        encryptedAndCompressedData,
        revToMatch,
        true,
      )
    ).rev;
  }

  // --------------------------------------------------
  private async _getMetaRev(localRev: string | null): Promise<string> {
    pfLog(2, `${SyncService.name}.${this._getMetaRev.name}()`, { localRev });
    const syncProvider = this._syncProviderOrError;
    try {
      const r = await syncProvider.getFileRev(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      return r.rev;
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  private async _downloadMetaFile(
    localRev: string | null = null,
  ): Promise<{ remoteMeta: RemoteMeta; remoteMetaRev: string }> {
    // return {} as any as MetaFileContent;
    pfLog(2, `${SyncService.name}.${this._downloadMetaFile.name}()`, { localRev });
    const syncProvider = this._syncProviderOrError;
    try {
      const r = await syncProvider.downloadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev,
      );
      if (r.dataStr.startsWith(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX)) {
        alert('LOCK PRESENT: ' + r.dataStr);
        const lockClientId = r.dataStr
          .slice(MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX.length)
          .replace(/\n/g, '');

        if (lockClientId === (await this._metaModelCtrl.loadClientId())) {
          throw new LockFileFromLocalClientPresentError();
        }
        throw new LockFilePresentError();
      }
      const data = await this._decompressAndDecryptData<RemoteMeta>(r.dataStr);

      return { remoteMeta: validateMetaBase(data), remoteMetaRev: r.rev };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  private async _saveLocalMetaFileContent(
    localMetaFileContent: LocalMeta,
  ): Promise<unknown> {
    return this._metaModelCtrl.saveMetaModel(localMetaFileContent);
  }

  private async _lockRemoteMetaFile(revToMatch: string | null = null): Promise<string> {
    pfLog(2, `${SyncService.name}.${this._lockRemoteMetaFile.name}()`, { revToMatch });
    const syncProvider = this._syncProviderOrError;
    const clientId = await this._metaModelCtrl.loadClientId();
    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        MetaModelCtrl.META_FILE_LOCK_CONTENT_PREFIX + clientId,
        revToMatch,
        true,
      )
    ).rev;
  }

  // ---------------------------------------

  private _getModelIdsToUpdateFromRevMaps({
    revMapNewer,
    revMapToOverwrite,
    context,
  }: {
    revMapNewer: RevMap;
    revMapToOverwrite: RevMap;
    context: 'UPLOAD' | 'DOWNLOAD';
  }): { toUpdate: string[]; toDelete: string[] } {
    const all = getModelIdsToUpdateFromRevMaps(revMapNewer, revMapToOverwrite);
    try {
      return {
        toUpdate: all.toUpdate.filter(
          // NOTE: we are also filtering out all non-existing local models
          (modelId) => !this.m[modelId]?.modelCfg.isMainFileModel,
        ),
        toDelete: all.toDelete.filter(
          // NOTE: we are also filtering out all non-existing local models
          (modelId) => !this.m[modelId]?.modelCfg.isMainFileModel,
        ),
      };
    } catch (e) {
      // TODO maybe remove error again
      if (context === 'UPLOAD') {
        throw new RevMapModelMismatchErrorOnUpload({ e, revMapNewer, revMapToOverwrite });
      } else {
        throw new RevMapModelMismatchErrorOnDownload({
          e,
          revMapNewer,
          revMapToOverwrite,
        });
      }
    }
  }

  // --------------------------------------------------
  private async _compressAndeEncryptData<T>(
    data: T,
    modelVersion: number,
  ): Promise<string> {
    const { isCompress, isEncrypt, encryptKey } =
      this._getEncryptionAndCompressionSettings();
    return this._encryptAndCompressHandler.compressAndEncrypt({
      data,
      modelVersion,
      isCompress,
      isEncrypt,
      encryptKey,
    });
  }

  private async _decompressAndDecryptData<T>(dataStr: string): Promise<T> {
    const { encryptKey } = this._getEncryptionAndCompressionSettings();
    return (
      await this._encryptAndCompressHandler.decompressAndDecrypt<T>({
        dataStr,
        encryptKey,
      })
    ).data;
  }

  // --------------------------------------------------

  // TODO make async work correctly
  private async _updateLocalMainModels(remote: RemoteMeta): Promise<void> {
    const mainModelData = remote.mainModelData;
    if (typeof mainModelData === 'object' && mainModelData !== null) {
      pfLog(
        2,
        `${SyncService.name}.${this._updateLocalMainModels.name}() updating mainModels`,
        Object.keys(mainModelData),
      );

      Object.keys(mainModelData).forEach((modelId) => {
        if (modelId in mainModelData) {
          // TODO better typing
          this.m[modelId].save(mainModelData[modelId] as any, {
            isUpdateRevAndLastUpdate: false,
          });
        }
      });
    } else {
      console.warn('No remote.mainModelData!!! Is this correct?');
    }
  }

  private async _getMainFileModelData(
    completeModel?: AllSyncModels<MD>,
  ): Promise<MainModelData> {
    const mainFileModelIds = Object.keys(this.m).filter(
      (modelId) => this.m[modelId].modelCfg.isMainFileModel,
    );
    console.log('____________________________', mainFileModelIds);

    completeModel = completeModel || (await this._pfapiMain.getAllSyncModelData());
    const mainModelData: MainModelData = Object.fromEntries(
      mainFileModelIds.map((modelId) => [modelId, completeModel[modelId]]),
    );
    pfLog(2, `${SyncService.name}.${this._getMainFileModelData.name}()`, {
      mainModelData,
    });
    return mainModelData;
  }

  // --------------------------------------------------
  private _allModelIds(): string[] {
    return Object.keys(this.m);
  }

  private _fakeFullRevMap(): RevMap {
    const revMap: RevMap = {};
    this._allModelIds().forEach((modelId) => {
      if (!this.m[modelId].modelCfg.isMainFileModel) {
        revMap[modelId] = 'UPDATE_ALL_REV';
      }
    });
    return revMap;
  }

  private _isSameRev(a: string | null, b: string | null): boolean {
    if (!a || !b) {
      console.warn(`Invalid revs a:${a} and b:${b} given`);
      return false;
    }
    if (a === b) {
      return true;
    }
    return cleanRev(a) === cleanRev(b);
  }
}
