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
    /*
    downloadAndCheckMetaFile => IN_SYNC | Error | PFAPIMetaFileContent
    downloadAndCheckRevisions => {}

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
    const modelIdsToDownload = await this._getModelsIdsToDownload(
      remoteMetaFileContent.revMap,
      localSyncMetaData.revMap,
    );
    const realRevMap = {} as any as PFAPIRevMap;
    await Promise.all(
      modelIdsToDownload.map(
        (modelId) =>
          // TODO properly create rev map
          this._uploadModelId(modelId).then((rev) => {
            if (typeof rev === 'string') {
              realRevMap[modelId] = rev;
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

  private async _uploadModelId(modelId: string): Promise<string | Error> {
    const syncProvider = await this._currentSyncProviderOrError$
      .pipe(first())
      .toPromise();
    return syncProvider.uploadFileData(modelId, '', '', true);
  }

  private async _getModelsIdsToDownload(
    revMapNewer: PFAPIRevMap,
    revMapToOverwrite: PFAPIRevMap,
  ): Promise<string[]> {
    return Object.keys(revMapNewer).filter(
      (modelId) => revMapNewer[modelId] !== revMapToOverwrite[modelId],
    );
  }

  private async _updateLocalMetaFileContent(
    localMetaFileContent: PFAPIMetaFileContent,
  ): Promise<void> {
    // TODO
  }

  private async _downloadMetaFile(): Promise<PFAPIMetaFileContent> {
    return {} as any as PFAPIMetaFileContent;
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

  private async _downloadAndCheckRevisions(): Promise<
    PFAPIMetaFileContent | PFAPISyncStatus
  > {
    return PFAPISyncStatus.InSync;
  }

  private _handleConflict(): void {}

  private _getConflictInfo(): void {}
}
