import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderCredentialsStore } from '../../sync-provider-credentials-store';
import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { createSha1Hash } from '../../../../../util/create-sha-1-hash';
import { IS_ELECTRON } from '../../../../../app.constants';

export interface LocalFileSyncElectronCfg {
  X: string;
}

export interface LocalFileSyncElectronCredentials {
  folderPath: string;
}

// TODO fix errors here
export class LocalFileSyncElectron
  implements SyncProviderServiceInterface<LocalFileSyncElectronCredentials>
{
  readonly id: SyncProviderId = SyncProviderId.LocalFile;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  public credentialsStore!: SyncProviderCredentialsStore<LocalFileSyncElectronCredentials>;

  constructor(cfg: LocalFileSyncElectronCfg) {}

  async isReady(): Promise<boolean> {
    return true;
  }

  async setCredentials(credentials: LocalFileSyncElectronCredentials): Promise<void> {
    await this.credentialsStore.save(credentials);
  }

  async getFileRev(targetPath: string, localRev: string): Promise<{ rev: string }> {
    try {
      const r = await this.downloadFile(targetPath, localRev);
      return {
        rev: r.rev,
      };
    } catch (e) {
      const folderPath = await this._getFolderPath();
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
        throw new Error('No folder');
      }
      throw e;
    }
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const r = await window.ea.fileSyncLoad({
      localRev,
      filePath: await this._getFilePath(targetPath),
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

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const r = await window.ea.fileSyncSave({
      localRev,
      filePath: await this._getFilePath(targetPath),
      dataStr,
    });
    if (r instanceof Error) {
      throw r;
    }
    console.log('uploadFileData AAAAAAFTER', targetPath, localRev);
    return { rev: await this._getLocalRev(dataStr) };
  }

  async removeFile(targetPath: string): Promise<void> {
    // TODO
    alert('Not implemented');
    // try {
    //   await this._api.remove(this._getPath(targetPath));
    // } catch (e) {
    //   throw e;
    // }
    // TODO error handling
  }

  async checkDirAndOpenPickerIfNotExists(): Promise<void> {
    const folderPath = await this._getFolderPath();
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

  private async _getFolderPath(): Promise<string> {
    const folderPath = (await this.credentialsStore.load())?.folderPath;
    if (!folderPath) {
      throw new Error('No folder path given');
    }
    return folderPath;
  }

  private async _getFilePath(targetPath: string): Promise<string> {
    const folderPath = await this._getFolderPath();
    return `${folderPath}/${targetPath}.json`;
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
      this.credentialsStore.save({
        folderPath: dir,
      });
    }
  }
}
