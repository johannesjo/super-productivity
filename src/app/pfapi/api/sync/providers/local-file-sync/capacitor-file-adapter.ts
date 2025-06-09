import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FileAdapter } from './file-adapter.interface';

const BASE = 'sync/';

export class CapacitorFileAdapter implements FileAdapter {
  constructor(private readonly _directory: Directory) {}

  async readFile(filePath: string): Promise<string> {
    const res = await Filesystem.readFile({
      path: BASE + filePath,
      directory: this._directory,
      encoding: Encoding.UTF8,
    });

    if (typeof res.data === 'string') {
      return res.data;
    } else if (res.data instanceof Blob) {
      return await res.data.text();
    } else {
      throw new Error('Unexpected data type from Filesystem.readFile');
    }
  }

  async writeFile(filePath: string, dataStr: string): Promise<void> {
    await Filesystem.writeFile({
      path: BASE + filePath,
      data: dataStr,
      directory: this._directory,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: BASE + filePath,
        directory: this._directory,
      });
    } catch (e) {
      // Ignore file not found errors
      if (e?.toString?.().includes('File does not exist')) {
        console.error(`File not found for deletion: ${filePath}`);
        return;
      }
      throw e;
    }
  }

  // async checkDirExists(dirPath: string): Promise<boolean> {
  //   try {
  //     await Filesystem.stat({
  //       path:BASE+ dirPath,
  //       directory: this.directory,
  //     });
  //     return true;
  //   } catch (e) {
  //     return false;
  //   }
  // }
}
