import { FileAdapter } from '../../../pfapi/api/sync/providers/local-file-sync/file-adapter.interface';
import { SafService } from './saf.service';

export class SafFileAdapter implements FileAdapter {
  async readFile(filePath: string): Promise<string> {
    try {
      return await SafService.readFile(filePath);
    } catch (error) {
      if (error?.toString?.().includes('File not found')) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  async writeFile(filePath: string, dataStr: string): Promise<void> {
    await SafService.writeFile(filePath, dataStr);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await SafService.deleteFile(filePath);
    } catch (error) {
      // Ignore file not found errors
      if (error?.toString?.().includes('File not found')) {
        console.error(`File not found for deletion: ${filePath}`);
        return;
      }
      throw error;
    }
  }

  async checkDirExists?(dirPath: string): Promise<boolean> {
    // SAF works with a selected folder, so we just check if we have permission
    return await SafService.checkPermission();
  }
}
