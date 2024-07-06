import { Injectable } from '@angular/core';
import {
  SyncProvider,
  SyncProviderServiceInterface,
  SyncTarget,
} from '../sync-provider.model';
import { Observable, of } from 'rxjs';
import { IS_ELECTRON } from '../../../app.constants';
import { SyncGetRevResult } from '../sync.model';
import { concatMap, first, map } from 'rxjs/operators';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncElectronService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.LocalFile;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean> = of(IS_ELECTRON).pipe(
    concatMap(() => this._folderPath$),
    map((v) => !!v),
  );

  private _folderPath$: Observable<string | null> = this._globalConfigService.sync$.pipe(
    map((sync) => sync.localFileSync.syncFolderPath),
  );
  private _folderPathOnce$: Observable<string | null> = this._folderPath$.pipe(first());

  constructor(private _globalConfigService: GlobalConfigService) {}

  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    const r = await window.ea.fileSyncGetRevAndClientUpdate({
      filePath: await this._getFilePath(syncTarget),
      localRev,
    });
    return r as any;
  }

  async uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    const r = await window.ea.fileSyncSave({
      localRev,
      filePath: await this._getFilePath(syncTarget),
      dataStr,
    });
    return r as any;
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const r = await window.ea.fileSyncLoad({
      localRev,
      filePath: await this._getFilePath(syncTarget),
    });
    return r as any;
  }

  private async _getFilePath(syncTarget: SyncTarget): Promise<string> {
    const folderPath = await this._folderPathOnce$.toPromise();
    if (!folderPath) {
      throw new Error('No folder path given');
    }
    return `${folderPath}/${syncTarget}.json`;
  }
}
