import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

import {
  FileHashCreationAPIError,
  InvalidDataSPError,
  NoRevAPIError,
  RemoteFileNotFoundAPIError,
  UploadRevToMatchMismatchAPIError,
  WebCryptoNotAvailableError,
} from '../../../errors/errors';
import { md5HashPromise } from '../../../../../util/md5-hash';
import { pfLog } from '../../../util/log';

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
  readonly fileDirectory: Directory = Directory.Data as const;

  public privateCfg!: SyncProviderPrivateCfgStore<LocalFileSyncAndroidPrivateCfg>;

  async isReady(): Promise<boolean> {
    return true;
  }

  async setPrivateCfg(privateCfg: LocalFileSyncAndroidPrivateCfg): Promise<void> {
    return;
    // await this.privateCfg.save(privateCfg);
  }

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    pfLog(2, `${LocalFileSyncAndroid.name}.getFileRev`, { targetPath, localRev });
    try {
      const r = await this.downloadFile(targetPath, localRev);
      return { rev: r.rev };
    } catch (e) {
      pfLog(1, `${LocalFileSyncAndroid.name}.getFileRev error`, e);
      throw e;
    }
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    pfLog(2, `${LocalFileSyncAndroid.name}.downloadFile`, { targetPath, localRev });

    try {
      const filePath = await this._getFilePath(targetPath);
      const res = await Filesystem.readFile({
        path: filePath,
        directory: this.fileDirectory,
        encoding: Encoding.UTF8,
      });

      // Ensure res.data is a string
      let dataStr: string;
      if (typeof res.data === 'string') {
        dataStr = res.data;
      } else if (res.data instanceof Blob) {
        dataStr = await res.data.text();
      } else {
        throw new RemoteFileNotFoundAPIError({ targetPath, res });
      }

      // Validate content
      if (!dataStr || dataStr === '') {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      if (dataStr.length <= 3) {
        throw new InvalidDataSPError(`File content too short: ${dataStr.length} chars`);
      }

      return {
        rev: await this._getLocalRev(dataStr),
        dataStr,
      };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError || e instanceof InvalidDataSPError) {
        throw e;
      }

      if (e?.toString?.().includes('File does not exist')) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      pfLog(1, `${LocalFileSyncAndroid.name}.downloadFile error`, e);
      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    pfLog(2, `${LocalFileSyncAndroid.name}.uploadFile`, {
      targetPath,
      dataLength: dataStr?.length,
      revToMatch,
      isForceOverwrite,
    });

    try {
      // Check if file exists and compare revs if not force overwrite
      if (!isForceOverwrite && revToMatch) {
        try {
          const existingFile = await this.downloadFile(targetPath, revToMatch);
          if (existingFile.rev !== revToMatch) {
            pfLog(1, `${LocalFileSyncAndroid.name}.uploadFile rev mismatch`, {
              existingFileRev: existingFile.rev,
              revToMatch,
            });
            throw new UploadRevToMatchMismatchAPIError();
          }
        } catch (err) {
          // File doesn't exist yet, that's fine for upload
          if (!(err instanceof RemoteFileNotFoundAPIError)) {
            throw err;
          }
        }
      }

      const filePath = await this._getFilePath(targetPath);
      await Filesystem.writeFile({
        path: filePath,
        data: dataStr,
        directory: this.fileDirectory,
        encoding: Encoding.UTF8,
      });

      const newRev = await this._getLocalRev(dataStr);
      return { rev: newRev };
    } catch (e) {
      pfLog(1, `${LocalFileSyncAndroid.name}.uploadFile error`, e);
      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    pfLog(2, `${LocalFileSyncAndroid.name}.removeFile`, { targetPath });
    try {
      const filePath = await this._getFilePath(targetPath);
      await Filesystem.deleteFile({
        path: filePath,
        directory: this.fileDirectory,
      });
    } catch (e) {
      // Ignore file not found errors when removing
      if (e?.toString?.().includes('File does not exist')) {
        pfLog(2, `${LocalFileSyncAndroid.name}.removeFile - file doesn't exist`, {
          targetPath,
        });
        return;
      }
      pfLog(1, `${LocalFileSyncAndroid.name}.removeFile error`, e);
      throw e;
    }
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
