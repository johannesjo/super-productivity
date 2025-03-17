import { PFBaseCfg, PFMetaFileContent, PFModelCfgs, PFRevMap } from './pf.model';
import { PFSyncDataService } from './pf-sync-data.service';
import { PFSyncProviderServiceInterface } from './sync-provider-services/pf-sync-provider.interface';
import { MiniObservable } from './util/mini-observable';
import { PFSyncStatus } from './pf.const';
import { PFRevMismatchError } from './errors/pf-errors';

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

  constructor(
    cfg$: MiniObservable<PFBaseCfg>,
    _currentSyncProvider$: MiniObservable<PFSyncProviderServiceInterface<unknown> | null>,
    _pfSyncDataService: PFSyncDataService<MD>,
  ) {
    this._cfg$ = cfg$;
    this._currentSyncProvider$ = _currentSyncProvider$;
    this._pfSyncDataService = _pfSyncDataService;
  }

  async sync(): Promise<PFSyncStatus | any> {
    if (!(await this._isReadyForSync())) {
      return PFSyncStatus.NotConfigured;
    }

    const localSyncMetaData = await this._getLocalSyncMetaData();
    const remoteMetaFileContent = await this._downloadMetaFile();

    switch (this._checkMetaFileContent(remoteMetaFileContent, localSyncMetaData)) {
      case PFSyncStatus.UpdateLocal:
        return this._updateLocal(remoteMetaFileContent, localSyncMetaData);
      case PFSyncStatus.UpdateRemote:
        return this._updateRemote(remoteMetaFileContent, localSyncMetaData);
      case PFSyncStatus.Conflict:
      // TODO
      case PFSyncStatus.InSync:
        return PFSyncStatus.InSync;
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
    await Promise.all(
      toUpdate.map(
        (groupId) =>
          // TODO properly create rev map
          // TODO
          this._uploadModel(groupId, {}).then((rev) => {
            if (typeof rev === 'string') {
              realRevMap[groupId] = this._cleanRev(rev);
            }
          }),
        // TODO double check remote revs with remoteMetaFileContent.revMap and retry a couple of times for each promise individually
        // since remote might hava an incomplete update
      ),
    );

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

  private async _downloadModel(
    groupId: string,
    expectedRev: string | null = null,
  ): Promise<string | Error> {
    const syncProvider = this._getCurrentSyncProviderOrError();

    if (expectedRev) {
      const revResult = await syncProvider.getFileRevAndLastClientUpdate(
        groupId,
        expectedRev,
      );
      if (
        typeof revResult === 'object' &&
        'rev' in revResult &&
        !this._isSameRev(revResult.rev, expectedRev)
      ) {
        throw new PFRevMismatchError('Download Model Rev Mismatch1');
      }
    }

    const result = await syncProvider.downloadFileData(groupId, expectedRev);
    if (
      typeof result === 'object' &&
      'rev' in result &&
      !this._isSameRev(result.rev, expectedRev)
    ) {
      throw new PFRevMismatchError('Download Model Rev Mismatch2');
    }
    return result.dataStr;
  }

  private _getRemoteFilePathForModelId(modelId: string): string {
    return modelId;
  }

  private async _uploadModel(modelId: string, data: any): Promise<string | Error> {
    const target = this._getRemoteFilePathForModelId(modelId);
    const syncProvider = this._getCurrentSyncProviderOrError();

    // TODO
    // this._deCompressAndDecryptData(data)
    // TODO
    return (await syncProvider.uploadFileData(target, '', '', true)).rev;
  }

  private async _getModelIdsToUpdate(
    revMapNewer: PFRevMap,
    revMapToOverwrite: PFRevMap,
  ): Promise<{ toUpdate: string[]; toDelete: string[] }> {
    const toUpdate: string[] = Object.keys(revMapNewer).filter(
      (groupId) =>
        this._cleanRev(revMapNewer[groupId]) !==
        this._cleanRev(revMapToOverwrite[groupId]),
    );
    const toDelete: string[] = Object.keys(revMapToOverwrite).filter(
      (groupId) => !revMapNewer[groupId],
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

  private async _updateLocalModel(groupId: string, modelData: string): Promise<unknown> {
    // TODO
    // this._deCompressAndDecryptData()
    return {} as any as unknown;
  }

  private async _deleteLocalModel(groupId: string, modelData: string): Promise<unknown> {
    return {} as any as unknown;
  }

  private async _updateLocalMetaFileContent(
    localMetaFileContent: PFMetaFileContent,
  ): Promise<void> {
    // TODO
  }

  private async _downloadMetaFile(): Promise<PFMetaFileContent> {
    return {} as any as PFMetaFileContent;
  }

  private async _compressAndeEncryptData(data: string): Promise<string> {
    // TODO
    return data;
  }

  private async _deCompressAndDecryptData(data: string): Promise<string> {
    // TODO
    return data;
  }

  private _checkMetaFileContent(
    remoteMetaFileContent: PFMetaFileContent,
    localSyncMetaData: PFMetaFileContent,
  ): PFSyncStatus {
    // const allRemoteRevs = Object.values(remoteMetaFileContent.revMap);
    // const allLocalRevs = Object.values(localSyncMetaData.revMap);

    return PFSyncStatus.InSync;
  }

  private async _getLocalSyncMetaData(): Promise<PFMetaFileContent> {
    return {} as any as PFMetaFileContent;
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
