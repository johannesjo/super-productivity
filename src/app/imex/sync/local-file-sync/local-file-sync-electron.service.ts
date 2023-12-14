import { Injectable } from '@angular/core';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
import { Observable, of } from 'rxjs';
import { IS_ELECTRON } from '../../../app.constants';
import { SyncGetRevResult } from '../sync.model';
import { IPC } from '../../../../../electron/shared-with-frontend/ipc-events.const';
import { concatMap, first, map } from 'rxjs/operators';
import { GlobalConfigService } from '../../../features/config/global-config.service';

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncElectronService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.LocalFile;
  isUploadForcePossible?: boolean;
  isReady$: Observable<boolean> = of(IS_ELECTRON).pipe(
    concatMap(() => this._filePath$),
    map((v) => !!v),
  );

  private _filePath$: Observable<string | null> = this._globalConfigService.sync$.pipe(
    map((sync) => sync.localFileSync.syncFilePath),
  );
  private _filePathOnce$: Observable<string | null> = this._filePath$.pipe(first());

  constructor(private _globalConfigService: GlobalConfigService) {}

  async getRevAndLastClientUpdate(
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      const r = await window.electronAPI.invoke(IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE, {
        filePath,
        localRev,
      });
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }

  async uploadAppData(
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      const r = (await window.electronAPI.invoke(IPC.FILE_SYNC_SAVE, {
        localRev,
        filePath,
        dataStr,
      })) as Promise<string | Error>;
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }

  async downloadAppData(
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      const r = (await window.electronAPI.invoke(IPC.FILE_SYNC_LOAD, {
        localRev,
        filePath,
      })) as Promise<{ rev: string; dataStr: string | undefined }>;
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }
}
