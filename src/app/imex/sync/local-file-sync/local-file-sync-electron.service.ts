import { Injectable } from '@angular/core';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
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
    concatMap(() => this._filePath$),
    map((v) => !!v),
  );

  private _filePath$: Observable<string | null> = this._globalConfigService.sync$.pipe(
    map((sync) => sync.localFileSync.syncFilePath),
  );
  private _filePathOnce$: Observable<string | null> = this._filePath$.pipe(first());

  constructor(private _globalConfigService: GlobalConfigService) {}

  async getMainFileRevAndLastClientUpdate(
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      if (!filePath) {
        throw new Error('No file path given for getMainFileRevAndLastClientUpdate');
      }
      const r = await window.ea.fileSyncGetRevAndClientUpdate({
        filePath,
        localRev,
      });
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }

  async uploadMainFileData(
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      if (!filePath) {
        throw new Error('No file path given for uploadMainFileData');
      }
      const r = await window.ea.fileSyncSave({
        localRev,
        filePath,
        dataStr,
      });
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }

  async downloadMainFileData(
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const filePath = await this._filePathOnce$.toPromise();
    try {
      if (!filePath) {
        throw new Error('No file path given for downloadMainFileData');
      }
      const r = await window.ea.fileSyncLoad({
        localRev,
        filePath,
      });
      return r as any;
    } catch (e) {
      throw new Error(e as any);
    }
  }
}
