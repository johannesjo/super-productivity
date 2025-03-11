import { Injectable, inject } from '@angular/core';
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
import { createSha1Hash } from '../../../util/create-sha-1-hash';

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncElectronService implements SyncProviderServiceInterface {
  private _globalConfigService = inject(GlobalConfigService);

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

  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    try {
      const r = await this.downloadFileData(syncTarget, localRev);
      return {
        rev: r.rev,
      };
    } catch (e) {
      const folderPath = await this._folderPathOnce$.toPromise();
      try {
        const isDirExists = await this._checkDirExists(folderPath as string);
        if (!isDirExists) {
          alert('No valid folder selected for local file sync. Please select one.');
          this._pickDirectory();
          throw new Error('No valid folder selected');
        }
      } catch (err) {
        console.error(err);
        alert('No valid folder selected for local file sync. Please select one.');
        this._pickDirectory();
        throw new Error('No valid folder selected');
      }

      if (e?.toString?.().includes('ENOENT')) {
        return 'NO_REMOTE_DATA';
      }
      throw e;
    }
  }

  async uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    const r = await window.ea.fileSyncSave({
      localRev,
      filePath: await this._getFilePath(syncTarget),
      dataStr,
    });
    if (r instanceof Error) {
      throw r;
    }

    console.log('uploadFileData AAAAAAFTER', syncTarget, localRev);
    return this._getLocalRev(dataStr);
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const r = await window.ea.fileSyncLoad({
      localRev,
      filePath: await this._getFilePath(syncTarget),
    });

    if (r instanceof Error) {
      throw r;
    }

    if (!r.dataStr) {
      throw new Error('downloadFileData unknown error');
    }

    return {
      rev: await this._getLocalRev(r.dataStr),
      dataStr: r.dataStr,
    };
  }

  async checkDirAndOpenPickerIfNotExists(): Promise<void> {
    const folderPath = await this._folderPathOnce$.toPromise();
    try {
      const isDirExists = await this._checkDirExists(folderPath as string);
      if (!isDirExists) {
        alert(' Please select a local directory for file sync.');
        this._pickDirectory();
      }
    } catch (err) {
      console.error(err);
      alert(' Please select a local directory for file sync.');
      this._pickDirectory();
    }
  }

  private async _getFilePath(syncTarget: SyncTarget): Promise<string> {
    const folderPath = await this._folderPathOnce$.toPromise();
    if (!folderPath) {
      throw new Error('No folder path given');
    }
    return `${folderPath}/${syncTarget}.json`;
  }

  private _getLocalRev(dataStr: string): Promise<string> {
    return createSha1Hash(dataStr);
  }

  private async _checkDirExists(dirPath: string): Promise<boolean> {
    const r = await window.ea.checkDirExists({
      dirPath,
    });
    if (r instanceof Error) {
      throw r;
    }
    return r;
  }

  private async _pickDirectory(): Promise<void> {
    if (!IS_ELECTRON) {
      alert('Error: Not in Electron context');
      return;
    }

    const dir = await window.ea.pickDirectory();
    if (dir) {
      this._globalConfigService.updateSection('sync', {
        localFileSync: {
          syncFolderPath: dir,
        },
      });
    }
  }
}
