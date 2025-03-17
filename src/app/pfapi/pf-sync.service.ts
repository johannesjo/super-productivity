import { PFBaseCfg, PFMetaFileContent, PFModelCfgs, PFRevMap } from './pf.model';
import { PFSyncDataService } from './pf-sync-data.service';
import { PFSyncProviderServiceInterface } from './sync-provider-services/pf-sync-provider.interface';
import { MiniObservable } from './util/mini-observable';
import { PFSyncStatus } from './pf.const';
import {
  PFNoRemoteDataError,
  PFNoRemoteMetaFile,
  PFRevMismatchError,
} from './errors/pf-errors';
import { pfLog } from './util/pf-log';
import { PFMetaModelCtrl } from './pf-meta-model-ctrl';
import { PFEncryptAndCompressHandlerService } from './pf-encrypt-and-compress-handler.service';

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
export class PFSyncService<const MD extends PFModelCfgs> {
  private _cfg$: MiniObservable<PFBaseCfg>;
  private _currentSyncProvider$: MiniObservable<PFSyncProviderServiceInterface<unknown> | null>;

  private readonly _pfSyncDataService: PFSyncDataService<MD>;
  private readonly _metaModelCtrl: PFMetaModelCtrl;
  private readonly _encryptAndCompressHandler: PFEncryptAndCompressHandlerService;

  constructor(
    cfg$: MiniObservable<PFBaseCfg>,
    _currentSyncProvider$: MiniObservable<PFSyncProviderServiceInterface<unknown> | null>,
    _pfSyncDataService: PFSyncDataService<MD>,
    _metaModelCtrl: PFMetaModelCtrl,
    _encryptAndCompressHandler: PFEncryptAndCompressHandlerService,
  ) {
    this._cfg$ = cfg$;
    this._currentSyncProvider$ = _currentSyncProvider$;
    this._pfSyncDataService = _pfSyncDataService;
    this._metaModelCtrl = _metaModelCtrl;
    this._encryptAndCompressHandler = _encryptAndCompressHandler;
  }

  // TODO
  async sync(): Promise<PFSyncStatus | any> {
    try {
      if (!(await this._isReadyForSync())) {
        return PFSyncStatus.NotConfigured;
      }

      const localSyncMetaData = await this._metaModelCtrl.loadMetaModel();
      const remoteMetaFileContent = await this._downloadMetaFile(
        localSyncMetaData.metaRev,
      );

      const metaFileCheck = this._checkMetaFileContent(
        remoteMetaFileContent,
        localSyncMetaData,
      );
      pfLog('sync(): metaFileCheck', metaFileCheck);
      switch (metaFileCheck) {
        case PFSyncStatus.UpdateLocal:
          return this._updateLocal(remoteMetaFileContent, localSyncMetaData);
        case PFSyncStatus.UpdateRemote:
          return this._updateRemote(remoteMetaFileContent, localSyncMetaData);
        case PFSyncStatus.Conflict:
        // TODO
        case PFSyncStatus.InSync:
          return PFSyncStatus.InSync;
      }
    } catch (e) {
      if (e instanceof Error) {
        if (e instanceof PFNoRemoteMetaFile) {
          const localSyncMetaData = await this._metaModelCtrl.loadMetaModel();
          console.log({ localSyncMetaData });

          return this._updateRemoteAll(localSyncMetaData);
        }
      }
      throw e;
    }
  }

  private async _updateLocal(
    remoteMetaFileContent: PFMetaFileContent,
    localSyncMetaData: PFMetaFileContent,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = await this._getModelIdsToUpdate(
      remoteMetaFileContent.revMap,
      localSyncMetaData.revMap,
    );
    const realRevMap: PFRevMap = {};
    await Promise.all(
      toUpdate.map((modelId) =>
        // TODO properly create rev map
        this._downloadModel(modelId).then((rev) => {
          if (typeof rev === 'string') {
            realRevMap[modelId] = rev;
          }
        }),
      ),
    );

    // TODO update local models
    await this._updateLocalUpdatedModels([], []);
    // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
    // since remote might hava an incomplete update

    // ON SUCCESS
    await this._updateLocalMetaFileContent({
      lastSync: Date.now(),
      lastLocalSyncModelUpdate: remoteMetaFileContent.lastLocalSyncModelUpdate,
      metaRev: remoteMetaFileContent.metaRev,
      revMap: remoteMetaFileContent.revMap,
      modelVersions: remoteMetaFileContent.modelVersions,
      crossModelVersion: remoteMetaFileContent.crossModelVersion,
    });
  }

  private async _updateRemote(
    remoteMetaFileContent: PFMetaFileContent,
    localSyncMetaData: PFMetaFileContent,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = await this._getModelIdsToUpdate(
      localSyncMetaData.revMap,
      remoteMetaFileContent.revMap,
    );
    const realRevMap: PFRevMap = {};
    alert('AAAa');
    await Promise.all(
      toUpdate.map(
        (modelId) =>
          this._pfSyncDataService.m[modelId]
            .load()
            .then((data) => this._uploadModel(modelId, data))
            .then((rev) => {
              realRevMap[modelId] = this._cleanRev(rev);
            }),
        // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually,
        //  since remote might hava an incomplete update
      ),
    );
    console.log(realRevMap);

    const metaRevAfterUpdate = await this._uploadMetaFile({
      ...localSyncMetaData,
      revMap: realRevMap,
    });

    // ON AFTER SUCCESS
    await this._updateLocalMetaFileContent({
      lastSync: Date.now(),
      lastLocalSyncModelUpdate: localSyncMetaData.lastLocalSyncModelUpdate,
      revMap: { ...localSyncMetaData.revMap, ...realRevMap },
      metaRev: metaRevAfterUpdate,
      modelVersions: localSyncMetaData.modelVersions,
      crossModelVersion: localSyncMetaData.crossModelVersion,
    });
  }

  private async _updateRemoteAll(localSyncMetaData: PFMetaFileContent): Promise<void> {
    const realRevMap: PFRevMap = {};
    const completeModelData = await this._pfSyncDataService.getCompleteSyncData();
    const allModelIds = Object.keys(completeModelData);
    await Promise.all(
      allModelIds.map(
        (modelId) =>
          this._uploadModel(modelId, completeModelData[modelId]).then((rev) => {
            realRevMap[modelId] = this._cleanRev(rev);
          }),
        // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
        // since remote might hava an incomplete update
      ),
    );

    const lastSync = Date.now();
    const metaRevAfterUpdate = await this._uploadMetaFile({
      ...localSyncMetaData,
      lastSync,
      revMap: realRevMap,
      metaRev: '',
    });

    // ON SUCCESS
    await this._updateLocalMetaFileContent({
      ...localSyncMetaData,
      lastSync,
      metaRev: metaRevAfterUpdate,
      revMap: realRevMap,
    });
  }

  private _isReadyForSync(): Promise<boolean> {
    return this._getCurrentSyncProviderOrError().isReady();
  }

  private _getCurrentSyncProviderOrError(): PFSyncProviderServiceInterface<unknown> {
    const provider = this._currentSyncProvider$.value;
    if (!provider) {
      throw new Error('No sync provider set');
    }
    return provider;
  }

  private _getRemoteFilePathForModelId(modelId: string): string {
    return modelId;
  }

  private async _uploadModel(
    modelId: string,
    data: any,
    localRev: string | null = null,
  ): Promise<string> {
    const target = this._getRemoteFilePathForModelId(modelId);
    const syncProvider = this._getCurrentSyncProviderOrError();
    const encryptedAndCompressedData = await this._compressAndeEncryptData(
      data,
      this._pfSyncDataService.m[modelId].modelCfg.modelVersion,
    );
    return (
      await syncProvider.uploadFileData(
        target,
        encryptedAndCompressedData,
        localRev,
        true,
      )
    ).rev;
  }

  private async _downloadModel(
    modelId: string,
    expectedRev: string | null = null,
  ): Promise<string | Error> {
    const syncProvider = this._getCurrentSyncProviderOrError();
    const checkRev = (revResult: { rev: string }, msg: string): void => {
      if (
        typeof revResult === 'object' &&
        'rev' in revResult &&
        !this._isSameRev(revResult.rev, expectedRev)
      ) {
        throw new PFRevMismatchError(`Download Model Rev: ${msg}`);
      }
    };

    if (expectedRev) {
      checkRev(
        await syncProvider.getFileRevAndLastClientUpdate(modelId, expectedRev),
        '1',
      );
    }

    const result = await syncProvider.downloadFileData(modelId, expectedRev);
    checkRev(result, '2');
    return this._decompressAndDecryptData(result.dataStr);
  }

  private async _getModelIdsToUpdate(
    revMapNewer: PFRevMap,
    revMapToOverwrite: PFRevMap,
  ): Promise<{ toUpdate: string[]; toDelete: string[] }> {
    const toUpdate: string[] = Object.keys(revMapNewer).filter(
      (modelId) =>
        this._cleanRev(revMapNewer[modelId]) !==
        this._cleanRev(revMapToOverwrite[modelId]),
    );
    const toDelete: string[] = Object.keys(revMapToOverwrite).filter(
      (modelId) => !revMapNewer[modelId],
    );

    return { toUpdate, toDelete };
  }

  private async _updateLocalUpdatedModels(
    // TODO
    updates: any[],
    toDelete: string[],
  ): Promise<unknown> {
    return await Promise.all([
      // TODO
      ...updates.map((update) => this._updateLocalModel('XX', 'XXX')),
      // TODO
      ...toDelete.map((id) => this._deleteLocalModel(id, 'aaa')),
    ]);
  }

  private async _updateLocalModel(modelId: string, modelData: string): Promise<unknown> {
    // TODO
    // this._deCompressAndDecryptData()
    return {} as any as unknown;
  }

  private async _deleteLocalModel(modelId: string, modelData: string): Promise<unknown> {
    return {} as any as unknown;
  }

  // META MODEL
  // ----------
  private async _uploadMetaFile(
    meta: PFMetaFileContent,
    rev: string | null = null,
  ): Promise<string> {
    pfLog('sync: _uploadMetaModel()', meta);
    const encryptedAndCompressedData = await this._compressAndeEncryptData(
      meta,
      meta.crossModelVersion,
    );
    return this._uploadModel(
      PFMetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
      encryptedAndCompressedData,
      rev,
    );
  }

  private async _downloadMetaFile(localRev?: string | null): Promise<PFMetaFileContent> {
    // return {} as any as PFMetaFileContent;
    pfLog('sync: _downloadMetaFile()', localRev);
    const syncProvider = this._getCurrentSyncProviderOrError();
    try {
      const r = await syncProvider.downloadFileData(
        PFMetaModelCtrl.META_MODEL_REMOTE_FILE_NAME,
        localRev || null,
      );
      return this._decompressAndDecryptData(r.dataStr);
    } catch (e) {
      if (e instanceof Error && e instanceof PFNoRemoteDataError) {
        throw new PFNoRemoteMetaFile();
      }
      throw e;
    }
  }

  private async _updateLocalMetaFileContent(
    localMetaFileContent: PFMetaFileContent,
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

  private _checkMetaFileContent(
    remoteMetaFileContent: PFMetaFileContent,
    localSyncMetaData: PFMetaFileContent,
  ): PFSyncStatus {
    // const allRemoteRevs = Object.values(remoteMetaFileContent.revMap);
    // const allLocalRevs = Object.values(localSyncMetaData.revMap);

    return PFSyncStatus.InSync;
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
