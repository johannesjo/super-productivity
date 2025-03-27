import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { IS_ELECTRON } from '../../../../../app.constants';
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

export interface LocalFileSyncElectronPrivateCfg {
  folderPath: string;
}

export class LocalFileSyncElectron
  implements SyncProviderServiceInterface<LocalFileSyncElectronPrivateCfg>
{
  readonly id: SyncProviderId = SyncProviderId.LocalFile;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  public privateCfg!: SyncProviderPrivateCfgStore<LocalFileSyncElectronPrivateCfg>;

  async isReady(): Promise<boolean> {
    if (!IS_ELECTRON) {
      throw new Error('Not running in Electron context');
    }
    return true;
    // try {
    //   const folderPath = await this._getFolderPath();
    //   const isDirExists = await this._checkDirExists(folderPath);
    //   return isDirExists;
    // } catch (e) {
    //   pfLog(1, `${LocalFileSyncElectron.name}.isReady error`, e);
    //   return false;
    // }
  }

  async setPrivateCfg(privateCfg: LocalFileSyncElectronPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    pfLog(2, `${LocalFileSyncElectron.name}.${this.getFileRev.name}`, {
      targetPath,
      localRev,
    });
    try {
      const r = await this.downloadFile(targetPath, localRev);
      return { rev: r.rev };
    } catch (e) {
      pfLog(1, `${LocalFileSyncElectron.name}.${this.getFileRev.name} error`, e);

      // Handle folder path issues
      try {
        const folderPath = await this._getFolderPath();
        const isDirExists = await this._checkDirExists(folderPath);
        if (!isDirExists) {
          pfLog(
            1,
            `${LocalFileSyncElectron.name}.${this.getFileRev.name} - No valid folder selected`,
          );
          this._pickDirectory();
          throw new Error('No valid folder selected for local file sync');
        }
      } catch (folderErr) {
        pfLog(
          1,
          `${LocalFileSyncElectron.name}.${this.getFileRev.name} - Folder path error`,
          folderErr,
        );
        this._pickDirectory();
        throw new Error('No valid folder selected for local file sync');
      }

      // Handle specific file errors
      if (e?.toString?.().includes('ENOENT')) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      throw e;
    }
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    pfLog(2, `${LocalFileSyncElectron.name}.downloadFile`, { targetPath, localRev });

    try {
      const filePath = await this._getFilePath(targetPath);
      const r = await (window as any).ea.fileSyncLoad({
        localRev,
        filePath,
      });

      if (r instanceof Error) {
        throw r;
      }

      // Validate data
      if (!r.dataStr || r.dataStr === '') {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }

      if (r.dataStr.length <= 3) {
        throw new InvalidDataSPError(`File content too short: ${r.dataStr.length} chars`);
      }

      return {
        rev: await this._getLocalRev(r.dataStr),
        dataStr: r.dataStr,
      };
    } catch (e) {
      if (e instanceof RemoteFileNotFoundAPIError || e instanceof InvalidDataSPError) {
        throw e;
      }
      if (e?.toString?.().includes('ENOENT')) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }
      pfLog(1, `${LocalFileSyncElectron.name}.downloadFile error`, e);
      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    revToMatch: string | null,
    isForceOverwrite = false,
  ): Promise<{ rev: string }> {
    pfLog(2, `${LocalFileSyncElectron.name}.uploadFile`, {
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
            pfLog(1, `${LocalFileSyncElectron.name}.uploadFile rev mismatch`, {
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
      const r = await (window as any).ea.fileSyncSave({
        localRev: revToMatch,
        filePath,
        dataStr,
      });

      if (r instanceof Error) {
        throw r;
      }

      const newRev = await this._getLocalRev(dataStr);
      return { rev: newRev };
    } catch (e) {
      pfLog(1, `${LocalFileSyncElectron.name}.uploadFile error`, e);
      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    pfLog(2, `${LocalFileSyncElectron.name}.removeFile`, { targetPath });

    try {
      if (!IS_ELECTRON) {
        throw new Error('Not running in Electron context');
      }

      const filePath = await this._getFilePath(targetPath);
      const r = await (window as any).ea.fileSyncRemove({ filePath });

      if (r instanceof Error) {
        throw r;
      }
    } catch (e) {
      // Ignore file not found errors when removing
      if (e?.toString?.().includes('ENOENT')) {
        pfLog(2, `${LocalFileSyncElectron.name}.removeFile - file doesn't exist`, {
          targetPath,
        });
        return;
      }

      pfLog(1, `${LocalFileSyncElectron.name}.removeFile error`, e);
      throw e;
    }
  }

  async checkDirAndOpenPickerIfNotExists(): Promise<void> {
    pfLog(2, `${LocalFileSyncElectron.name}.checkDirAndOpenPickerIfNotExists`);

    try {
      const folderPath = await this._getFolderPath();
      const isDirExists = await this._checkDirExists(folderPath);

      if (!isDirExists) {
        pfLog(1, `${LocalFileSyncElectron.name} - No valid directory, opening picker`);
        await this._pickDirectory();
      }
    } catch (err) {
      pfLog(
        1,
        `${LocalFileSyncElectron.name}.checkDirAndOpenPickerIfNotExists error`,
        err,
      );
      await this._pickDirectory();
    }
  }

  private async _getFolderPath(): Promise<string> {
    const privateCfg = await this.privateCfg.load();
    const folderPath = privateCfg?.folderPath;

    if (!folderPath) {
      throw new Error('No folder path configured for local file sync');
    }

    return folderPath;
  }

  private async _getFilePath(targetPath: string): Promise<string> {
    const folderPath = await this._getFolderPath();
    // Normalize path: remove leading slash if present in targetPath
    const normalizedPath = targetPath.startsWith('/')
      ? targetPath.substring(1)
      : targetPath;
    return `${folderPath}/${normalizedPath}`;
  }

  private async _getLocalRev(dataStr: string): Promise<string> {
    if (!dataStr) {
      throw new InvalidDataSPError('Empty data string');
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

  private async _checkDirExists(dirPath: string): Promise<boolean> {
    try {
      const r = await (window as any).ea.checkDirExists({ dirPath });
      if (r instanceof Error) {
        throw r;
      }
      return r;
    } catch (e) {
      pfLog(1, `${LocalFileSyncElectron.name}._checkDirExists error`, e);
      return false;
    }
  }

  private async _pickDirectory(): Promise<void> {
    pfLog(1, `${LocalFileSyncElectron.name}._pickDirectory - Not in Electron context`);

    try {
      const dir = await (window as any).ea.pickDirectory();
      alert(dir);
      if (dir) {
        await this.privateCfg.save({ folderPath: dir });
      }
    } catch (e) {
      pfLog(1, `${LocalFileSyncElectron.name}._pickDirectory error`, e);
      throw e;
    }
  }
}
