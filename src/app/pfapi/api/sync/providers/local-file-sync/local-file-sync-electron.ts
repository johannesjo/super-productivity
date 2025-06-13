// src/app/pfapi/api/sync/providers/local-file-sync/electron-file-adapter.ts
import { LocalFileSyncBase } from './local-file-sync-base';
import { IS_ELECTRON } from '../../../../../app.constants';
import { pfLog } from '../../../util/log';
import { ElectronFileAdapter } from './electron-file-adapter';
import { LocalFileSyncPrivateCfg } from '../../../pfapi.model';

export class LocalFileSyncElectron extends LocalFileSyncBase {
  private static readonly L = 'LocalFileSyncElectron';

  constructor() {
    super(new ElectronFileAdapter());
  }

  async isReady(): Promise<boolean> {
    if (!IS_ELECTRON) {
      throw new Error('LocalFileSyncElectron is only available in electron');
    }
    const privateCfg = await this.privateCfg.load();
    return !!privateCfg?.syncFolderPath;
  }

  async setPrivateCfg(privateCfg: LocalFileSyncPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFilePath(targetPath: string): Promise<string> {
    const folderPath = await this._getFolderPath();
    // Normalize path: remove leading slash if present in targetPath
    const normalizedPath = targetPath.startsWith('/')
      ? targetPath.substring(1)
      : targetPath;
    return `${folderPath}/${normalizedPath}`;
  }

  private async _checkDirAndOpenPickerIfNotExists(): Promise<void> {
    pfLog(2, `${LocalFileSyncElectron.L}.${this._checkDirAndOpenPickerIfNotExists.name}`);

    try {
      const folderPath = await this._getFolderPath();
      const isDirExists = await this._checkDirExists(folderPath);

      if (!isDirExists) {
        pfLog(0, `${LocalFileSyncElectron.L} - No valid directory, opening picker`);
        await this.pickDirectory();
      }
    } catch (err) {
      pfLog(
        1,
        `${LocalFileSyncElectron.L}.${this._checkDirAndOpenPickerIfNotExists.name}() error`,
        err,
      );
      await this.pickDirectory();
    }
  }

  private async _getFolderPath(): Promise<string> {
    const privateCfg = await this.privateCfg.load();
    const folderPath = privateCfg?.syncFolderPath;
    if (!folderPath) {
      await this._checkDirAndOpenPickerIfNotExists();
      const updatedCfg = await this.privateCfg.load();
      return updatedCfg?.syncFolderPath as string;
    }
    return folderPath;
  }

  private async _checkDirExists(dirPath: string): Promise<boolean> {
    try {
      const r = await (window as any).ea.checkDirExists({ dirPath });
      if (r instanceof Error) {
        throw r;
      }
      return r;
    } catch (e) {
      pfLog(0, `${LocalFileSyncElectron.L}.${this._checkDirExists.name}() error`, e);
      return false;
    }
  }

  async pickDirectory(): Promise<string | void> {
    pfLog(2, `${LocalFileSyncElectron.L}.pickDirectory()`);

    try {
      const dir = await (window as any).ea.pickDirectory();
      if (dir) {
        await this.privateCfg.save({ syncFolderPath: dir });
      }
      return dir;
    } catch (e) {
      pfLog(0, `${LocalFileSyncElectron.L}.pickDirectory() error`, e);
      throw e;
    }
  }
}
