import {
  PFAPICfg,
  PFAPIMetaFileContent,
  PFAPIModelCfg,
  PFAPIRevMap,
  PFAPISyncProviderServiceInterface,
} from './pfapi.model';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

enum PFAPISyncStatus {
  InSync = 'InSync',
  UpdateRemote = 'UpdateRemote',
  UpdateLocal = 'UpdateLocal',
  Conflict = 'Conflict',
  IncompleteRemoteData = 'IncompleteRemoteData',
  NotConfigured = 'NotConfigured',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
enum PFAPIError {
  RevMismatch = 'RevMismatch',
  // ...
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class PFAPISyncService<Ms extends PFAPIModelCfg<unknown>[]> {
  private _cfg$: Observable<PFAPICfg>;
  private _currentSyncProvider$: Observable<PFAPISyncProviderServiceInterface | null>;
  // TODO
  private _currentSyncProviderOrError$: Observable<PFAPISyncProviderServiceInterface>;

  constructor(
    cfg$: Observable<PFAPICfg>,
    _currentSyncProvider$: Observable<PFAPISyncProviderServiceInterface>,
  ) {
    this._cfg$ = cfg$;
    this._currentSyncProvider$ = _currentSyncProvider$;
  }

  async sync(): Promise<PFAPISyncStatus | any> {
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

    if (!this._isReadyForSync()) {
      return PFAPISyncStatus.NotConfigured;
    }

    const localSyncMetaData = await this._getLocalSyncMetaData();
    const remoteMetaFileContent = await this._downloadMetaFile();

    switch (this._checkMetaFileContent(remoteMetaFileContent, localSyncMetaData)) {
      case PFAPISyncStatus.UpdateLocal:
        return this._updateLocal(remoteMetaFileContent, localSyncMetaData);
      case PFAPISyncStatus.UpdateRemote:
      case PFAPISyncStatus.Conflict:
      case PFAPISyncStatus.InSync:
        return PFAPISyncStatus.InSync;
    }
  }

  private async _updateLocal(
    remoteMetaFileContent: PFAPIMetaFileContent,
    localSyncMetaData: PFAPIMetaFileContent,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = await this._getModelsGroupIdsToUpdate(
      remoteMetaFileContent.revMap,
      localSyncMetaData.revMap,
    );
    const realRevMap: PFAPIRevMap = {};
    await Promise.all(
      toUpdate.map((groupId) =>
        // TODO properly create rev map
        this._downloadModelGroup(groupId).then((rev) => {
          if (typeof rev === 'string') {
            realRevMap[groupId] = rev;
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
    });
  }

  private async _updateRemote(
    remoteMetaFileContent: PFAPIMetaFileContent,
    localSyncMetaData: PFAPIMetaFileContent,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toUpdate, toDelete } = await this._getModelsGroupIdsToUpdate(
      localSyncMetaData.revMap,
      remoteMetaFileContent.revMap,
    );
    const realRevMap: PFAPIRevMap = {};
    await Promise.all(
      toUpdate.map(
        (groupId) =>
          // TODO properly create rev map
          // TODO
          this._uploadModelGroup(groupId, {}).then((rev) => {
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
    });
  }

  private _isReadyForSync(): boolean {
    // TODO check provider
    return true;
  }

  private async _downloadModelGroup(
    groupId: string,
    expectedRev?: string,
  ): Promise<string | Error> {
    const syncProvider = await this._currentSyncProviderOrError$
      .pipe(first())
      .toPromise();
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
        throw new Error('Rev mismatch');
      }
    }

    const result = await syncProvider.downloadFileData(groupId, expectedRev || null);
    if (
      typeof result === 'object' &&
      'rev' in result &&
      !this._isSameRev(result.rev, expectedRev)
    ) {
      throw new Error('Rev mismatch');
    }
    return result.dataStr;
  }

  private _getRemoteFilePathForGroupId(groupId: string): string {
    // TODO
    return groupId;
  }

  private async _uploadModelGroup(groupId: string, data: any): Promise<string | Error> {
    const target = this._getRemoteFilePathForGroupId(groupId);
    const syncProvider = await this._currentSyncProviderOrError$
      .pipe(first())
      .toPromise();
    // TODO
    // this._deCompressAndDecryptData(data)
    // TODO
    return syncProvider.uploadFileData(target, '', '', true);
  }

  private async _getModelsGroupIdsToUpdate(
    revMapNewer: PFAPIRevMap,
    revMapToOverwrite: PFAPIRevMap,
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
    localMetaFileContent: PFAPIMetaFileContent,
  ): Promise<void> {
    // TODO
  }

  private async _downloadMetaFile(): Promise<PFAPIMetaFileContent> {
    return {} as any as PFAPIMetaFileContent;
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
    remoteMetaFileContent: PFAPIMetaFileContent,
    localSyncMetaData: PFAPIMetaFileContent,
  ): PFAPISyncStatus {
    return PFAPISyncStatus.InSync;
  }

  private async _getLocalSyncMetaData(): Promise<PFAPIMetaFileContent> {
    return {} as any as PFAPIMetaFileContent;
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
