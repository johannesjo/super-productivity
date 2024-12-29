import { Injectable, inject } from '@angular/core';
import {
  SyncProvider,
  SyncProviderServiceInterface,
  SyncTarget,
} from '../sync-provider.model';
import { Observable, of } from 'rxjs';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { SyncGetRevResult } from '../sync.model';
import { concatMap, map } from 'rxjs/operators';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { androidInterface } from '../../../features/android/android-interface';
import { createSha1Hash } from '../../../util/create-sha-1-hash';

const ERROR_MSG_DOWNLOAD = 'Could not load file with android adapter';

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncAndroidService implements SyncProviderServiceInterface {
  private _globalConfigService = inject(GlobalConfigService);

  id: SyncProvider = SyncProvider.LocalFile;
  isUploadForcePossible?: boolean = false;
  isReady$: Observable<boolean> = of(IS_ANDROID_WEB_VIEW).pipe(
    concatMap(() =>
      this._globalConfigService.sync$.pipe(
        map((sync) => sync.isEnabled && sync.syncProvider === SyncProvider.LocalFile),
      ),
    ),
    map((v) => !!v),
  );

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
      if (e?.toString?.().includes(ERROR_MSG_DOWNLOAD)) {
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
    const filePath = await this._getFilePath(syncTarget);
    androidInterface.writeFile(filePath, dataStr);
    return this._getLocalRev(dataStr);
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const filePath = await this._getFilePath(syncTarget);
    const dataStr = androidInterface.readFile(filePath);
    if (!dataStr) {
      throw new Error(ERROR_MSG_DOWNLOAD);
    }

    return {
      rev: await this._getLocalRev(dataStr),
      dataStr,
    };
  }

  private async _getFilePath(syncTarget: SyncTarget): Promise<string> {
    return `${syncTarget}.json`;
  }

  private _getLocalRev(dataStr: string): Promise<string> {
    return createSha1Hash(dataStr);
  }
}
