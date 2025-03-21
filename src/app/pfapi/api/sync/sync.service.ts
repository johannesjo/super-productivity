import {
  ConflictData,
  LocalMeta,
  MainModelData,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
} from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import { LOCK_FILE_NAME, SyncStatus } from '../pfapi.const';
import {
  LockFileEmptyOrMessedUpError,
  LockFileFromLocalClientPresentError,
  LockFilePresentError,
  NoRemoteDataError,
  NoRemoteMetaFile,
  NoSyncProviderSetError,
  RevMapModelMismatchErrorOnDownload,
  RevMapModelMismatchErrorOnUpload,
  RevMismatchError,
  UnableToWriteLockFileError,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class SyncService<const MD extends ModelCfgs> {
  public readonly m: ModelCfgToModelCtrl<MD>;
  public readonly IS_MAIN_FILE_MODE: boolean;

  readonly _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>;
  readonly _metaModelCtrl: MetaModelCtrl;
  readonly _encryptAndCompressHandler: EncryptAndCompressHandlerService;

  constructor(
    isMainFileMode: boolean,
    m: ModelCfgToModelCtrl<MD>,
    _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    _metaModelCtrl: MetaModelCtrl,
    _encryptAndCompressHandler: EncryptAndCompressHandlerService,
  ) {
    this.IS_MAIN_FILE_MODE = isMainFileMode;
    this.m = m;
    this._currentSyncProvider$ = _currentSyncProvider$;
    this._metaModelCtrl = _metaModelCtrl;
    this._encryptAndCompressHandler = _encryptAndCompressHandler;
  }

  async sync(): Promise<{ status: SyncStatus; conflictData?: ConflictData }> {
    try {
      if (!(await this._isReadyForSync())) {
        return { status: SyncStatus.NotConfigured };
      }
      const localMeta = await this._metaModelCtrl.loadMetaModel();

      // quick pre-check for all synced
      if (localMeta.lastSyncedUpdate === localMeta.lastUpdate) {
        const metaRev = await this._getMetaRev(localMeta.metaRev);
        if (metaRev === localMeta.metaRev) {
          return { status: SyncStatus.InSync };
        }
      }

      // NOTE: for cascading mode we don't need to check the lock file before
      const [{ remoteMeta, remoteRev }] = this.IS_MAIN_FILE_MODE
        ? await Promise.all([this._downloadMetaFile(localMeta.metaRev)])
        : // since we delete the lock file only AFTER writing the meta file, we can safely execute these in parallel
          // NOTE: a race condition introduced is, that one error might pop up before the other
          // so we should re-check the lock file, when handling errors from downloading the meta file
          await Promise.all([
            this._downloadMetaFile(localMeta.metaRev),
            this._awaitLockFilePermissionAndWrite(),
          ]);

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
          remoteRev,
        },
      );

      switch (status) {
        case SyncStatus.UpdateLocal:
          await this.updateLocal(
            remoteMeta,
            localMeta,
            remoteRev,
            // NOTE: because we checked lock file above for multi file mode
            !this.IS_MAIN_FILE_MODE,
          );
          return { status };
        case SyncStatus.UpdateRemote:
          await this.updateRemote(
            remoteMeta,
            localMeta,
            // NOTE: because we checked lock file above for multi file mode
            !this.IS_MAIN_FILE_MODE,
          );
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
      console.error(e);

      if (e instanceof NoRemoteMetaFile) {
        // if there is no remote meta file, we need to upload all data
        await this._writeLockFile(true);
        await this.uploadAll(true);
        return { status: SyncStatus.UpdateRemoteAll };
      }

      // this indicates an incomplete sync, so we need to retry to upload all data
      if (e instanceof LockFileFromLocalClientPresentError) {
        await this.uploadAll(true);
        return { status: SyncStatus.UpdateRemoteAll };
      }
      throw e;
    }
  }

  // --------------------------------------------------
  async uploadAll(isSkipLockFileCheck = false): Promise<void> {
    alert('UPLOAD ALL TO REMOTE');
    const local = await this._metaModelCtrl.loadMetaModel();
    return this.updateRemote(
      {
        modelVersions: local.modelVersions,
        crossModelVersion: local.crossModelVersion,
        lastUpdate: local.lastUpdate,
        revMap: {},
      },
      { ...local, revMap: this._fakeFullRevMap() },
      isSkipLockFileCheck,
    );
  }

  async downloadAll(isSkipLockFileCheck = false): Promise<void> {
    alert('DOWNLOAD ALL TO LOCAL');
    const local = await this._metaModelCtrl.loadMetaModel();
    const { remoteMeta, remoteRev } = await this._downloadMetaFile();
    const fakeLocal: LocalMeta = {
      // NOTE: we still need to use local modelVersions here, since they contain the latest model versions for migrations
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      revMap: {},
    };
    return this.updateLocal(remoteMeta, fakeLocal, remoteRev, isSkipLockFileCheck);
  }

  // --------------------------------------------------
  // NOTE: Public for testing only
  async updateLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    const fn = this.IS_MAIN_FILE_MODE ? this._updateLocalMAIN : this._updateLocalMULTI;
    return fn(remote, local, remoteRev, isSkipLockFileCheck);
  }

  async _updateLocalMAIN(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._updateLocalMAIN.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      remoteRev,
      isSkipLockFileCheck,
    });

    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: remote.revMap,
      revMapToOverwrite: local.revMap,
      context: 'DOWNLOAD',
    });

    if (toUpdate.length === 0 && toDelete.length === 0) {
      await this._updateLocalMainModels(remote);
      await this._updateLocalMetaFileContent({
        metaRev: remoteRev,
        lastSyncedUpdate: remote.lastUpdate,
        lastUpdate: remote.lastUpdate,
        revMap: validateRevMap({
          ...local.revMap,
        }),
        modelVersions: remote.modelVersions,
        crossModelVersion: remote.crossModelVersion,
      });
      return;
    }
    // TODO make rev change to see if there were updates before lock file maybe
    return this._updateLocalMULTI(remote, local, remoteRev, isSkipLockFileCheck);
  }

  async _updateLocalMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._updateLocalMULTI.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      isSkipLockFileCheck,
    });

    if (!isSkipLockFileCheck) {
      await this._awaitLockFilePermissionAndWrite();
    }

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

    await loadBalancer(
      downloadModelFns,
      this._getCurrentSyncProviderOrError().maxConcurrentRequests,
    );

    await this._updateLocalUpdatedModels(toUpdate, toDelete, dataMap);

    // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
    // since remote might hava an incomplete update

    // ON SUCCESS
    await this._updateLocalMetaFileContent({
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

    if (!isSkipLockFileCheck) {
      await this._removeLockFile();
    }
  }

  // ----------------------
  async updateRemote(
    remote: RemoteMeta,
    local: LocalMeta,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    return this.IS_MAIN_FILE_MODE
      ? this._updateRemoteMAIN(remote, local, isSkipLockFileCheck)
      : this._updateRemoteMULTI(remote, local, isSkipLockFileCheck);
  }

  async _updateRemoteMAIN(
    remote: RemoteMeta,
    local: LocalMeta,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._updateRemoteMAIN.name}()`, {
      remoteMeta: remote,
      localMeta: local,
      isSkipLockFileCheck,
    });

    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      context: 'UPLOAD',
    });

    if (toUpdate.length === 0 && toDelete.length === 0) {
      const mainModelData = await this._getMainFileModelData();
      const metaRevAfterUpdate = await this._uploadMetaFile({
        revMap: local.revMap,
        lastUpdate: local.lastUpdate,
        crossModelVersion: local.crossModelVersion,
        modelVersions: local.modelVersions,
        mainModelData,
      });
      // ON AFTER SUCCESS
      await this._updateLocalMetaFileContent({
        // leave as is basically
        lastUpdate: local.lastUpdate,
        modelVersions: local.modelVersions,
        crossModelVersion: local.crossModelVersion,
        lastSyncedUpdate: local.lastUpdate,
        revMap: local.revMap,

        // actual update
        metaRev: metaRevAfterUpdate,
      });
      return;
    }
    // TODO make rev change to see if there were updates before lock file maybe
    return this._updateRemoteMULTI(remote, local, isSkipLockFileCheck);
  }

  // NOTE: Public for testing only
  async _updateRemoteMULTI(
    remote: RemoteMeta,
    local: LocalMeta,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    const { toUpdate, toDelete } = this._getModelIdsToUpdateFromRevMaps({
      revMapNewer: local.revMap,
      revMapToOverwrite: remote.revMap,
      context: 'UPLOAD',
    });

    pfLog(2, `${SyncService.name}.${this._updateRemoteMULTI.name}()`, {
      toUpdate,
      toDelete,
      isSkipLockFileCheck,
      remote,
      local,
    });

    if (!isSkipLockFileCheck) {
      await this._awaitLockFilePermissionAndWrite();
    }
    const realRevMap: RevMap = {
      ...local.revMap,
    };
    const uploadModelFns = toUpdate.map(
      (modelId) => () =>
        this.m[modelId]
          .load()
          .then((data) =>
            this._uploadModel(modelId, this._getModelVersion(modelId), data),
          )
          .then((rev) => {
            realRevMap[modelId] = cleanRev(rev);
          }),
      // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually,
      //  since remote might hava an incomplete update
    );
    // const toDeleteFns = toDelete.map((modelId) => () => this._removeModel(modelId));

    await loadBalancer(
      uploadModelFns,
      this._getCurrentSyncProviderOrError().maxConcurrentRequests,
    );
    console.log({ realRevMap });

    const validatedRevMap = validateRevMap(realRevMap);
    const metaRevAfterUpdate = await this._uploadMetaFile({
      revMap: validatedRevMap,
      lastUpdate: local.lastUpdate,
      crossModelVersion: local.crossModelVersion,
      modelVersions: local.modelVersions,
      mainModelData: this.IS_MAIN_FILE_MODE
        ? await this._getMainFileModelData()
        : undefined,
    });

    // ON AFTER SUCCESS
    await this._updateLocalMetaFileContent({
      // leave as is basically
      lastUpdate: local.lastUpdate,
      modelVersions: local.modelVersions,
      crossModelVersion: local.crossModelVersion,

      // actual updates
      lastSyncedUpdate: local.lastUpdate,
      revMap: validatedRevMap,
      metaRev: metaRevAfterUpdate,
    });

    if (!isSkipLockFileCheck) {
      await this._removeLockFile();
    }
  }

  // --------------------------------------------------
  private _isReadyForSync(): Promise<boolean> {
    return this._getCurrentSyncProviderOrError().isReady();
  }

  private _getModelVersion(modelId: string): number {
    return this.m[modelId].modelCfg.modelVersion;
  }

  private _getCurrentSyncProviderOrError(): SyncProviderServiceInterface<unknown> {
    const provider = this._currentSyncProvider$.value;
    if (!provider) {
      throw new NoSyncProviderSetError();
    }
    return provider;
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
    const syncProvider = this._getCurrentSyncProviderOrError();
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

    const syncProvider = this._getCurrentSyncProviderOrError();
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

    const syncProvider = this._getCurrentSyncProviderOrError();
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
    rev: string | null = null,
  ): Promise<string> {
    const encryptedAndCompressedData = await this._compressAndeEncryptData(
      validateMetaBase(meta),
      meta.crossModelVersion,
    );
    pfLog(2, `${SyncService.name}.${this._uploadMetaFile.name}()`, {
      meta,
      encryptedAndCompressedData,
    });

    const syncProvider = this._getCurrentSyncProviderOrError();

    return (
      await syncProvider.uploadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        encryptedAndCompressedData,
        rev,
        true,
      )
    ).rev;
  }

  // --------------------------------------------------
  private async _getMetaRev(localRev?: string): Promise<string> {
    pfLog(2, `${SyncService.name}.${this._getMetaRev.name}()`, { localRev });
    const syncProvider = this._getCurrentSyncProviderOrError();
    try {
      const r = await syncProvider.getFileRev(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      return r.rev;
    } catch (e) {
      if (e instanceof NoRemoteDataError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  private async _downloadMetaFile(
    localRev?: string | null,
  ): Promise<{ remoteMeta: RemoteMeta; remoteRev: string }> {
    // return {} as any as MetaFileContent;
    pfLog(2, `${SyncService.name}.${this._downloadMetaFile.name}()`, { localRev });
    const syncProvider = this._getCurrentSyncProviderOrError();
    try {
      const r = await syncProvider.downloadFile(
        MetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      const data = await this._decompressAndDecryptData<RemoteMeta>(r.dataStr);
      return { remoteMeta: validateMetaBase(data), remoteRev: r.rev };
    } catch (e) {
      if (e instanceof NoRemoteDataError) {
        throw new NoRemoteMetaFile();
      }
      throw e;
    }
  }

  private async _updateLocalMetaFileContent(
    localMetaFileContent: LocalMeta,
  ): Promise<unknown> {
    return this._metaModelCtrl.saveMetaModel(localMetaFileContent);
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
      return this.IS_MAIN_FILE_MODE
        ? {
            toUpdate: all.toUpdate.filter(
              // NOTE: we are also filtering out all non-existing local models
              (modelId) => !this.m[modelId]?.modelCfg.isMainFileModel,
            ),
            toDelete: all.toDelete.filter(
              // NOTE: we are also filtering out all non-existing local models
              (modelId) => !this.m[modelId]?.modelCfg.isMainFileModel,
            ),
          }
        : {
            toUpdate: all.toUpdate,
            toDelete: all.toDelete,
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
    return this._encryptAndCompressHandler.compressAndEncrypt(data, modelVersion);
  }

  private async _decompressAndDecryptData<T>(data: string): Promise<T> {
    return (await this._encryptAndCompressHandler.decompressAndDecrypt<T>(data)).data;
  }

  // --------------------------------------------------
  private async _awaitLockFilePermissionAndWrite(): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._awaitLockFilePermissionAndWrite.name}()`);
    const syncProvider = this._getCurrentSyncProviderOrError();
    try {
      await this._writeLockFile();
    } catch (e) {
      if (e instanceof UnableToWriteLockFileError) {
        const res = await syncProvider.downloadFile(LOCK_FILE_NAME, null).catch(() => {
          console.error(e);
          throw new LockFileEmptyOrMessedUpError();
        });
        const localClientId = await this._metaModelCtrl.loadClientId();
        if (res.dataStr && res.dataStr === localClientId) {
          throw new LockFileFromLocalClientPresentError();
        }
        throw new LockFilePresentError();
      }
      throw e;
    }
  }

  private async _writeLockFile(isOverwrite = false): Promise<void> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    const localClientId = await this._metaModelCtrl.loadClientId();
    pfLog(2, `${SyncService.name}.${this._writeLockFile.name}()`, localClientId);
    try {
      await syncProvider.uploadFile(LOCK_FILE_NAME, localClientId, null, isOverwrite);
    } catch (e) {
      throw new UnableToWriteLockFileError();
    }
  }

  private async _removeLockFile(): Promise<void> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    pfLog(2, `${SyncService.name}.${this._removeLockFile.name}()`);
    await syncProvider.removeFile(LOCK_FILE_NAME);
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
          this.m[modelId].save(mainModelData[modelId] as any);
        }
      });
    } else {
      console.warn('No remote.mainModelData!!! Is this correct?');
    }
  }

  private async _getMainFileModelData(): Promise<MainModelData> {
    const mainFileModelIds = Object.keys(this.m).filter(
      (modelId) => this.m[modelId].modelCfg.isMainFileModel,
    );
    const mainModelData: MainModelData = Object.fromEntries(
      await Promise.all(
        mainFileModelIds.map(async (modelId) => [modelId, await this.m[modelId].load()]),
      ),
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
      revMap[modelId] = 'FAKE_VAL_TO_TRIGGER_UPDATE_ALL';
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
