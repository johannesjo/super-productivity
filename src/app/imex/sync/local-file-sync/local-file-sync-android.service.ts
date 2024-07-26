import { Injectable } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class LocalFileSyncAndroidService implements SyncProviderServiceInterface {
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

  constructor(private _globalConfigService: GlobalConfigService) {}

  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult> {
    const filePath = await this._getFilePath(syncTarget);
    const rev = androidInterface.getFileRev(filePath);
    return { rev } as any;
  }

  async uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    clientModified: number,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<string | Error> {
    const filePath = await this._getFilePath(syncTarget);
    androidInterface.writeFile(filePath, dataStr);
    return androidInterface.getFileRev(filePath);
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string | null,
  ): Promise<{ rev: string; dataStr: string | undefined }> {
    const filePath = await this._getFilePath(syncTarget);
    const rev = androidInterface.getFileRev(filePath);
    const dataStr = androidInterface.readFile(filePath);

    return {
      rev,
      dataStr,
    };
  }

  private async _getFilePath(syncTarget: SyncTarget): Promise<string> {
    return `${syncTarget}.json`;
  }
}
