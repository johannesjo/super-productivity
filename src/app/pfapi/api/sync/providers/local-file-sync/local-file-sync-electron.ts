import { SyncProviderId } from '../../../pfapi.const';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { createSha1Hash } from '../../../../../util/create-sha-1-hash';
import { IS_ELECTRON } from '../../../../../app.constants';
import { RemoteFileNotFoundAPIError } from '../../../errors/errors';

export interface LocalFileSyncElectronPrivateCfg {
  folderPath: string;
}

// TODO fix errors here
export class LocalFileSyncElectron
  implements SyncProviderServiceInterface<LocalFileSyncElectronPrivateCfg>
{
  readonly id: SyncProviderId = SyncProviderId.LocalFile;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  public privateCfg!: SyncProviderPrivateCfgStore<LocalFileSyncElectronPrivateCfg>;

  async isReady(): Promise<boolean> {
    return true;
  }

  async setPrivateCfg(privateCfg: LocalFileSyncElectronPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
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
    try {
      const r = await (window as any).ea.fileSyncLoad({
        localRev,
        filePath: await this._getFilePath(targetPath),
      });

      if (r instanceof Error) {
        throw r;
      }

      if (!r.dataStr) {
        throw new RemoteFileNotFoundAPIError();
      }

      return {
        rev: await this._getLocalRev(r.dataStr),
        dataStr: r.dataStr,
      };
    } catch (e) {
      if (e?.toString && e?.toString().includes('ENOENT')) {
        throw new RemoteFileNotFoundAPIError();
      }
      console.log(e);

      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const r = await (window as any).ea.fileSyncSave({
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
    const r = await (window as any).ea.fileSyncRemove({
      filePath: await this._getFilePath(targetPath),
    });
    if (r instanceof Error) {
      throw r;
    }
  }

  async checkDirAndOpenPickerIfNotExists(): Promise<void> {
    try {
      const folderPath = await this._getFolderPath();
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
    const folderPath = (await this.privateCfg.load())?.folderPath;
    if (!folderPath) {
      throw new Error('No folder path given');
    }
    return folderPath;
  }

  private async _getFilePath(targetPath: string): Promise<string> {
    const folderPath = await this._getFolderPath();
    return `${folderPath}/${targetPath}`;
  }

  private _getLocalRev(dataStr: string): Promise<string> {
    return createSha1Hash(dataStr);
  }

  private async _checkDirExists(dirPath: string): Promise<boolean> {
    const r = await (window as any).ea.checkDirExists({
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

    const dir = await (window as any).ea.pickDirectory();
    alert(dir);
    if (dir) {
      this.privateCfg.save({
        folderPath: dir,
      });
    }
  }
}
