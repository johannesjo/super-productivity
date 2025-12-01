// src/app/pfapi/api/sync/providers/local-file-sync/local-file-sync-base.ts
import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { FileAdapter } from './file-adapter.interface';
import {
  FileHashCreationAPIError,
  InvalidDataSPError,
  NoRevAPIError,
  RemoteFileNotFoundAPIError,
  UploadRevToMatchMismatchAPIError,
  WebCryptoNotAvailableError,
} from '../../../errors/errors';
import { md5HashPromise } from '../../../../../util/md5-hash';
import { PFLog } from '../../../../../core/log';
import { PrivateCfgByProviderId } from '../../../pfapi.model';

export abstract class LocalFileSyncBase
  implements SyncProviderServiceInterface<SyncProviderId.LocalFile>
{
  private static readonly LB = 'LocalFileSyncBase';

  readonly id = SyncProviderId.LocalFile;
  readonly isUploadForcePossible: boolean = false;
  readonly maxConcurrentRequests = 10;
  // since we cannot guarantee the order of files, we need to mush all our data into a single file
  readonly isLimitedToSingleFileSync = true;

  public privateCfg!: SyncProviderPrivateCfgStore<SyncProviderId.LocalFile>;

  protected constructor(protected fileAdapter: FileAdapter) {}

  abstract isReady(): Promise<boolean>;

  abstract setPrivateCfg(
    privateCfg: PrivateCfgByProviderId<SyncProviderId.LocalFile>,
  ): Promise<void>;

  protected abstract getFilePath(targetPath: string): Promise<string>;

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    PFLog.normal(`${LocalFileSyncBase.LB}.${this.getFileRev.name}`, {
      targetPath,
      localRev,
    });
    try {
      const r = await this.downloadFile(targetPath);
      return { rev: r.rev };
    } catch (e) {
      PFLog.critical(`${LocalFileSyncBase.LB}.${this.getFileRev.name} error`, e);
      throw e;
    }
  }

  async downloadFile(targetPath: string): Promise<{ rev: string; dataStr: string }> {
    PFLog.normal(`${LocalFileSyncBase.LB}.${this.downloadFile.name}()`, {
      targetPath,
    });

    try {
      const filePath = await this.getFilePath(targetPath);
      const dataStr = await this.fileAdapter.readFile(filePath);

      // Validate content
      if (!dataStr || dataStr === '') {
        throw new RemoteFileNotFoundAPIError({ targetPath });
      }
      if (dataStr.length <= 3) {
        throw new InvalidDataSPError(`File content too short: ${dataStr.length} chars`);
      }
      return {
        rev: await this._getLocalRev(dataStr),
        dataStr,
      };
    } catch (e) {
      // TODO move to file adapters
      // Handle common file not found errors
      if (
        e?.toString?.().includes('File not found') ||
        e?.toString?.().includes('does not exist') ||
        e?.toString?.().includes('ENOENT')
      ) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      PFLog.critical(`${LocalFileSyncBase.LB}.${this.downloadFile.name}() error`, e);
      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    PFLog.normal(`${LocalFileSyncBase.LB}.${this.uploadFile.name}()`, {
      targetPath,
      dataLength: dataStr?.length,
      revToMatch,
      isForceOverwrite,
    });

    try {
      // Check if file exists and compare revs if not force overwrite
      if (!isForceOverwrite && revToMatch) {
        try {
          const existingFile = await this.downloadFile(targetPath);
          if (existingFile.rev !== revToMatch) {
            PFLog.critical(
              `${LocalFileSyncBase.LB}.${this.uploadFile.name}() rev mismatch`,
              existingFile.rev,
              revToMatch,
            );
            throw new UploadRevToMatchMismatchAPIError();
          }
        } catch (err) {
          // File doesn't exist yet, that's fine for upload
          if (!(err instanceof RemoteFileNotFoundAPIError)) {
            throw err;
          }
        }
      }

      const filePath = await this.getFilePath(targetPath);
      await this.fileAdapter.writeFile(filePath, dataStr);

      const newRev = await this._getLocalRev(dataStr);
      return { rev: newRev };
    } catch (e) {
      PFLog.critical(`${LocalFileSyncBase.LB}.${this.uploadFile.name}() error`, e);
      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    PFLog.normal(`${LocalFileSyncBase.LB}.${this.removeFile.name}`, { targetPath });
    try {
      const filePath = await this.getFilePath(targetPath);
      await this.fileAdapter.deleteFile(filePath);
    } catch (e) {
      // Ignore file not found errors when removing
      if (
        // TODO move to file adapters
        e?.toString?.().includes('File does not exist') ||
        e?.toString?.().includes('ENOENT')
      ) {
        PFLog.normal(
          `${LocalFileSyncBase.LB}.${this.removeFile.name} - file doesn't exist`,
          {
            targetPath,
          },
        );
        return;
      }

      PFLog.critical(`${LocalFileSyncBase.LB}.${this.removeFile.name} error`, e);
      throw e;
    }
  }

  private async _getLocalRev(dataStr: string): Promise<string> {
    if (!dataStr) {
      throw new InvalidDataSPError('Empty data string when creating rev');
    }

    try {
      const hash = await md5HashPromise(dataStr);
      if (!hash) {
        throw new NoRevAPIError();
      }
      return hash;
    } catch (e) {
      if (e instanceof WebCryptoNotAvailableError) {
        throw e;
      }
      throw new FileHashCreationAPIError(e);
    }
  }
}
