// src/app/pfapi/api/sync/providers/local-file-sync/electron-file-adapter.ts
import { LocalFileSyncBase } from './local-file-sync-base';
import { FileAdapter } from './file-adapter.interface';
import { IS_ELECTRON } from '../../../../../app.constants';
import { pfLog } from '../../../util/log';
import { ElectronAPI } from '../../../../../../../electron/electronAPI';

export interface LocalFileSyncElectronPrivateCfg {
  syncFolderPath: string;
}

export class LocalFileSyncElectron extends LocalFileSyncBase<LocalFileSyncElectronPrivateCfg> {
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

  async setPrivateCfg(privateCfg: LocalFileSyncElectronPrivateCfg): Promise<void> {
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
    pfLog(
      2,
      `${LocalFileSyncElectron.name}.${this._checkDirAndOpenPickerIfNotExists.name}`,
    );

    try {
      const folderPath = await this._getFolderPath();
      const isDirExists = await this._checkDirExists(folderPath);

      if (!isDirExists) {
        pfLog(0, `${LocalFileSyncElectron.name} - No valid directory, opening picker`);
        await this.pickDirectory();
      }
    } catch (err) {
      pfLog(
        1,
        `${LocalFileSyncElectron.name}.${this._checkDirAndOpenPickerIfNotExists.name}() error`,
        err,
      );
      await this.pickDirectory();
    }
  }

  private async _getFolderPath(): Promise<string> {
    const privateCfg = await this.privateCfg.load();
    const folderPath = privateCfg?.syncFolderPath;
    if (!folderPath) {
      // throw new Error('No folder path configured for local file sync');
      await this._checkDirAndOpenPickerIfNotExists();
    }
    return folderPath as string;
  }

  private async _checkDirExists(dirPath: string): Promise<boolean> {
    try {
      const r = await (window as any).ea.checkDirExists({ dirPath });
      if (r instanceof Error) {
        throw r;
      }
      return r;
    } catch (e) {
      pfLog(0, `${LocalFileSyncElectron.name}.${this._checkDirExists.name}() error`, e);
      return false;
    }
  }

  async pickDirectory(): Promise<string | void> {
    pfLog(0, `${LocalFileSyncElectron.name}._pickDirectory - Not in Electron context`);

    try {
      const dir = await (window as any).ea.pickDirectory();
      if (dir) {
        await this.privateCfg.save({ syncFolderPath: dir });
      }
      return dir;
    } catch (e) {
      pfLog(0, `${LocalFileSyncElectron.name}._pickDirectory error`, e);
      throw e;
    }
  }
}

// -------------------------------------------------
// -------------------------------------------------
// -------------------------------------------------

class ElectronFileAdapter implements FileAdapter {
  private readonly ea = (window as any).ea as ElectronAPI;

  async readFile(filePath: string): Promise<string> {
    const result = await this.ea.fileSyncLoad({
      filePath,
      localRev: null,
    });
    if (result instanceof Error) {
      throw result;
    }

    return result.dataStr as string;
  }

  async writeFile(filePath: string, dataStr: string): Promise<void> {
    const result = await this.ea.fileSyncSave({
      localRev: null,
      filePath,
      dataStr,
    });
    if (result instanceof Error) {
      throw result;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const result = await this.ea.fileSyncRemove({
      filePath,
    });
    if (result instanceof Error) {
      throw result;
    }
  }

  async checkDirExists(dirPath: string): Promise<boolean> {
    const result = await this.ea.checkDirExists({
      dirPath,
    });
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }
}
