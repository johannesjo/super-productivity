import {
  LocalMeta,
  ModelCfgs,
  ModelCfgToModelCtrl,
  RemoteMeta,
  RevMap,
} from '../pfapi.model';
import { SyncProviderServiceInterface } from './sync-provider.interface';
import { MiniObservable } from '../util/mini-observable';
import { LOCK_FILE_NAME, LOG_PREFIX, SyncStatus } from '../pfapi.const';
import {
  LockFilePresentError,
  NoRemoteDataError,
  NoRemoteMetaFile,
  NoRevError,
  NoSyncProviderSet,
  RevMismatchError,
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

/*
(0. maybe write lock file)
1. Download main file (if changed rev)
2. Check updated timestamps for conflicts (=> on conflict check for incomplete data on remote)

A remote newer than local
1. Check which revisions don't match the local version
2. Download all files that don't match the local
3. Do complete data import to Database
4. update local revs and meta file data from remote
5. inform about completion and pass back complete data to developer for import

B local newer than remote
1. Check which revisions don't match the local version
2. Upload all files that don't match remote
3. Update local meta and upload to remote
4. inform about completion

On Conflict:
Offer to use remote or local (always create local backup before this)
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class SyncService<const MD extends ModelCfgs> {
  public readonly m: ModelCfgToModelCtrl<MD>;

  private readonly _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>;
  private readonly _metaModelCtrl: MetaModelCtrl;
  private readonly _encryptAndCompressHandler: EncryptAndCompressHandlerService;

  constructor(
    m: ModelCfgToModelCtrl<MD>,
    _currentSyncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null>,
    _metaModelCtrl: MetaModelCtrl,
    _encryptAndCompressHandler: EncryptAndCompressHandlerService,
  ) {
    this.m = m;
    this._currentSyncProvider$ = _currentSyncProvider$;
    this._metaModelCtrl = _metaModelCtrl;
    this._encryptAndCompressHandler = _encryptAndCompressHandler;
  }

  // TODO
  async sync(): Promise<{ status: SyncStatus; conflictData?: unknown }> {
    try {
      if (!(await this._isReadyForSync())) {
        return { status: SyncStatus.NotConfigured };
      }

      const localMeta = await this._metaModelCtrl.loadMetaModel();
      const { remoteMeta, remoteRev } = await this._downloadMetaFile(localMeta.metaRev);

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
          await this.updateLocal(remoteMeta, localMeta, remoteRev);
          return { status };
        case SyncStatus.UpdateRemote:
          await this.updateRemote(remoteMeta, localMeta);
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
      if (e instanceof Error) {
        if (e instanceof NoRemoteMetaFile) {
          const localSyncMetaData = await this._metaModelCtrl.loadMetaModel();
          console.log({ localSyncMetaData });
          alert('NO REMOTE FILE');
          await this.updateRemoteAll(localSyncMetaData);
          return { status: SyncStatus.UpdateRemoteAll };
        }
      }
      throw e;
    }
  }

  // NOTE: Public for testing
  async updateLocal(
    remote: RemoteMeta,
    local: LocalMeta,
    remoteRev: string,
  ): Promise<void> {
    pfLog(2, `${SyncService.name}.${this.updateLocal.name}()`, {
      remoteMeta: remote,
      localMeta: local,
    });
    await this._awaitLockFilePermission();
    // NOTE: also makes sense to lock, since otherwise we might get an incomplete state
    await this._writeLockFile();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = getModelIdsToUpdateFromRevMaps(
      remote.revMap,
      local.revMap,
    );
    const realRevMap: RevMap = {};
    const dataMap: { [key: string]: unknown } = {};

    await Promise.all(
      toUpdate.map((modelId) =>
        this._downloadModel(modelId).then(({ rev, data }) => {
          if (typeof rev === 'string') {
            realRevMap[modelId] = rev;
            dataMap[modelId] = data;
          }
        }),
      ),
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

  // NOTE: Public for testing
  async updateRemote(remote: RemoteMeta, local: LocalMeta): Promise<void> {
    alert('REMOTE');

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

    await this._awaitLockFilePermission();
    await this._writeLockFile();

    const realRevMap: RevMap = {
      ...local.revMap,
    };
    await Promise.all(
      toUpdate.map(
        (modelId) =>
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
      ),
    );
    console.log(realRevMap);

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

  // NOTE: Public for testing
  async updateRemoteAll(local: LocalMeta): Promise<void> {
    alert('REMOTE ALL');
    return this.updateRemote(
      {
        modelVersions: local.modelVersions,
        crossModelVersion: local.crossModelVersion,
        lastUpdate: local.lastUpdate,
        revMap: {},
      },
      local,
    );
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
      throw new NoSyncProviderSet();
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

  // private async _deleteLocalModel(modelId: string, modelData: string): Promise<unknown> {
  //   return {} as any as unknown;
  // }

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
      if (e instanceof Error && e instanceof NoRemoteDataError) {
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

  private async _awaitLockFilePermission(): Promise<boolean> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    try {
      const res = await syncProvider.downloadFile(LOCK_FILE_NAME, null);
      const localClientId = await this._metaModelCtrl.loadClientId();
      pfLog(
        2,
        `${SyncService.name}.${this._awaitLockFilePermission.name}()`,
        localClientId,
      );
      if (res.dataStr && res.dataStr === localClientId) {
        console.warn(
          LOG_PREFIX +
            ' Remote file present, but originated from current client. ' +
            localClientId,
        );
        return true;
      }
      throw new LockFilePresentError();
    } catch (e) {
      console.log(e);

      if (e instanceof NoRevError || e instanceof NoRemoteDataError) {
        return true;
      }
      throw e;
    }
    // TODO maybe check using last rev instead of clientId, if it is faster maybe
  }

  private async _writeLockFile(): Promise<void> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    const localClientId = await this._metaModelCtrl.loadClientId();
    pfLog(2, `${SyncService.name}.${this._writeLockFile.name}()`, localClientId);
    await syncProvider.uploadFile(LOCK_FILE_NAME, localClientId, null);
  }

  private async _removeLockFile(): Promise<void> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    pfLog(2, `${SyncService.name}.${this._removeLockFile.name}()`);
    await syncProvider.removeFile(LOCK_FILE_NAME);
  }

  private _handleConflict(): void {}

  private _getConflictInfo(): void {}

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
