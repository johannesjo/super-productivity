import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { androidInterface } from '../../../../../features/android/android-interface';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

import {
  FileHashCreationAPIError,
  InvalidDataSPError,
  NoRevAPIError,
  RemoteFileNotFoundAPIError,
  WebCryptoNotAvailableError,
} from '../../../errors/errors';
import { md5HashPromise } from '../../../../../util/md5-hash';

export type LocalFileSyncAndroidPrivateCfg = undefined;

// export interface LocalFileSyncAndroidPrivateCfg {
//   folderPath?: string;
// }

export class LocalFileSyncAndroid
  implements SyncProviderServiceInterface<LocalFileSyncAndroidPrivateCfg>
{
  readonly id: SyncProviderId = SyncProviderId.LocalFile;
  readonly isUploadForcePossible: boolean = false;
  readonly maxConcurrentRequests = 10;

  public privateCfg!: SyncProviderPrivateCfgStore<LocalFileSyncAndroidPrivateCfg>;

  async isReady(): Promise<boolean> {
    return true;
  }

  async setPrivateCfg(privateCfg: LocalFileSyncAndroidPrivateCfg): Promise<void> {
    return;
    // await this.privateCfg.save(privateCfg);
  }

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    try {
      const r = await this.downloadFile(targetPath, localRev);
      return {
        rev: r.rev,
      };
    } catch (e) {
      if (e instanceof InvalidDataSPError) {
      }
      throw e;
    }
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const filePath = await this._getFilePath(targetPath);
    const dataStr = androidInterface.readFile(filePath);
    await Filesystem.readFile({
      path: targetPath,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    if (dataStr === '') {
      throw new RemoteFileNotFoundAPIError();
    }
    if (!dataStr || dataStr.length <= 3) {
      throw new InvalidDataSPError();
    }
    return {
      rev: await this._getLocalRev(dataStr),
      dataStr,
    };
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string | null,
    isForceOverwrite?: boolean,
  ): Promise<{ rev: string }> {
    const filePath = await this._getFilePath(targetPath);
    // TODO check matching ref and overwrite
    await Filesystem.writeFile({
      path: filePath,
      data: dataStr,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return {
      rev: await this._getLocalRev(dataStr),
    };
  }

  async removeFile(filePath: string): Promise<void> {
    await Filesystem.deleteFile({
      path: filePath,
      directory: Directory.Documents,
    });
  }

  private async _getFilePath(targetPath: string): Promise<string> {
    return `${targetPath}`;
  }

  private async _getLocalRev(dataStr: string): Promise<string> {
    if (!dataStr) {
      throw new InvalidDataSPError(dataStr);
    }

    try {
      const hash = await md5HashPromise(dataStr);
      if (!hash) {
        throw new NoRevAPIError();
      }
      console.log({ hash });

      return hash;
    } catch (e) {
      if (e instanceof WebCryptoNotAvailableError) {
        throw e;
      }
      throw new FileHashCreationAPIError(e);
    }
  }
}
