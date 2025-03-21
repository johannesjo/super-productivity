import {
  ConflictData,
  LocalMeta,
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
import { validateRemoteMeta } from '../util/validate-remote-meta';
import { validateRevMap } from '../util/validate-rev-map';
import { loadBalancer } from '../util/load-balancer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class SyncService<const MD extends ModelCfgs> {
  public readonly m: ModelCfgToModelCtrl<MD>;
  public readonly IS_CASCADE: boolean;

  readonly _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>;
  readonly _metaModelCtrl: MetaModelCtrl;
  readonly _encryptAndCompressHandler: EncryptAndCompressHandlerService;

  constructor(
    isCascadingMode: boolean,
    m: ModelCfgToModelCtrl<MD>,
    _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    _metaModelCtrl: MetaModelCtrl,
    _encryptAndCompressHandler: EncryptAndCompressHandlerService,
  ) {
    this.IS_CASCADE = isCascadingMode;
    this.m = m;
    this._currentSyncProvider$ = _currentSyncProvider$;
    this._metaModelCtrl = _metaModelCtrl;
    this._encryptAndCompressHandler = _encryptAndCompressHandler;
  }

  // TODO
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
      const [{ remoteMeta, remoteRev }] = this.IS_CASCADE
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
          await this.updateLocal(remoteMeta, localMeta, remoteRev, true);
          alert('UPDATE_LOCAL DONE');
          return { status };
        case SyncStatus.UpdateRemote:
          await this.updateRemote(remoteMeta, localMeta, true);
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

  // NOTE: Public for testing only
  async updateLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    const fn = this.IS_CASCADE
      ? this._updateLocalCascadingMode
      : this._updateLocalMultiFileMode;
    return fn(remote, local, remoteRev, isSkipLockFileCheck);
  }

  async _updateLocalCascadingMode(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this._updateLocalCascadingMode.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });

    // if (!isSkipLockFileCheck) {
    //   await this._awaitLockFilePermissionAndWrite();
    // }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const modelIds = getModelIdsToUpdateFromRevMaps(remote.revMap, local.revMap);
    const toUpdate = modelIds.toUpdate.filter(
      (modelId) => !this.m[modelId].modelCfg.isMainFileModel,
    );

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

    await this._updateLocalUpdatedModels(toUpdate, [], dataMap);

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

    await this._removeLockFile();
  }

  async _updateLocalMultiFileMode(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    // TODO split up in two different functions for cascading and non cascading
    // .filter(
    //     (modelId) => !this.m[modelId].modelCfg.isMainFileModel,
    //   );

    pfLog(2, `${SyncService.name}.${this.updateLocal.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });

    if (!isSkipLockFileCheck) {
      await this._awaitLockFilePermissionAndWrite();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = getModelIdsToUpdateFromRevMaps(
      remote.revMap,
      local.revMap,
    );

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

    await this._updateLocalUpdatedModels(toUpdate, [], dataMap);

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

    await this._removeLockFile();
  }

  // NOTE: Public for testing only
  async updateRemote(
    remote: RemoteMeta,
    local: LocalMeta,
    isSkipLockFileCheck = false,
  ): Promise<void> {
    // TODO split up in two different functions for cascading and non cascading
    // .filter(
    //     (modelId) => !this.m[modelId].modelCfg.isMainFileModel,
    //   );

    const { toUpdate, toDelete } = getModelIdsToUpdateFromRevMaps(
      local.revMap,
      remote.revMap,
    );

    pfLog(2, `${SyncService.name}.${this.updateRemote.name}()`, {
      toUpdate,
      toDelete,
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
    await this._removeLockFile();
  }

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

  private async _updateLocalUpdatedModels(
    toUpdate: string[],
    toDelete: string[],
    dataMap: { [key: string]: unknown },
  ): Promise<unknown> {
    return await Promise.all([
      ...toUpdate.map((modelId) => this._updateLocalModel(modelId, dataMap[modelId])),
      // TODO
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
      validateRemoteMeta(meta),
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
      return { remoteMeta: validateRemoteMeta(data), remoteRev: r.rev };
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

  private async _compressAndeEncryptData<T>(
    data: T,
    modelVersion: number,
  ): Promise<string> {
    return this._encryptAndCompressHandler.compressAndEncrypt(data, modelVersion);
  }

  private async _decompressAndDecryptData<T>(data: string): Promise<T> {
    return (await this._encryptAndCompressHandler.decompressAndDecrypt<T>(data)).data;
  }

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
