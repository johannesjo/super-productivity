// src/app/pfapi/api/sync/providers/local-file-sync/capacitor-file-adapter.ts
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalFileSyncBase } from './local-file-sync-base';
import { FileAdapter } from './file-adapter.interface';

export type LocalFileSyncAndroidPrivateCfg = undefined;

export class LocalFileSyncAndroid extends LocalFileSyncBase<LocalFileSyncAndroidPrivateCfg> {
  constructor() {
    super(new CapacitorFileAdapter(Directory.Data));
  }

  async isReady(): Promise<boolean> {
    return true;
  }

  async setPrivateCfg(privateCfg: LocalFileSyncAndroidPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFilePath(targetPath: string): Promise<string> {
    return `${targetPath}`;
  }
}

// -------------------------------------------------
// -------------------------------------------------
// -------------------------------------------------

class CapacitorFileAdapter implements FileAdapter {
  constructor(private readonly directory = Directory.Data) {}

  async readFile(filePath: string): Promise<string> {
    const res = await Filesystem.readFile({
      path: filePath,
      directory: this.directory,
      encoding: Encoding.UTF8,
    });

    if (typeof res.data === 'string') {
      return res.data;
    } else if (res.data instanceof Blob) {
      return await res.data.text();
    } else {
      throw new Error('Unexpected data type');
    }
    // return String(res.data);
  }

  async writeFile(filePath: string, dataStr: string): Promise<void> {
    await Filesystem.writeFile({
      path: filePath,
      data: dataStr,
      directory: this.directory,
      encoding: Encoding.UTF8,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    await Filesystem.deleteFile({
      path: filePath,
      directory: this.directory,
    });
  }
}
