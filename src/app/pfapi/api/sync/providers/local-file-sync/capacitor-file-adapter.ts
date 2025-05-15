import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FileAdapter } from './file-adapter.interface';

export class CapacitorFileAdapter implements FileAdapter {
  constructor(private readonly _directory: Directory) {}

  async readFile(filePath: string): Promise<string> {
    const res = await Filesystem.readFile({
      path: filePath,
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
      path: filePath,
      data: dataStr,
      directory: this._directory,
      encoding: Encoding.UTF8,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: this._directory,
      });
    } catch (e) {
      // Ignore file not found errors
      if (e?.toString?.().includes('File does not exist')) {
        return;
      }
      throw e;
    }
  }

  // async checkDirExists(dirPath: string): Promise<boolean> {
  //   try {
  //     await Filesystem.stat({
  //       path: dirPath,
  //       directory: this.directory,
  //     });
  //     return true;
  //   } catch (e) {
  //     return false;
  //   }
  // }
}
