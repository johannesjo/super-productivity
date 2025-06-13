import { Directory } from '@capacitor/filesystem';
import { LocalFileSyncBase } from './local-file-sync-base';
import { LocalFileSyncPrivateCfg } from '../../../pfapi.model';
import { SafService } from './droid-saf/saf.service';
import { SafFileAdapter } from './droid-saf/saf-file-adapter';

export class LocalFileSyncAndroid extends LocalFileSyncBase {
  constructor(public directory = Directory.Documents) {
    super(
      new SafFileAdapter(async () => {
        const cfg = await this.privateCfg.load();
        return cfg?.safFolderUri;
      }),
    );
  }

  async isReady(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    // Check if SAF is enabled and has valid permissions
    if (privateCfg?.safFolderUri?.length) {
      const hasPermission = await SafService.checkPermission(privateCfg.safFolderUri);
      if (!hasPermission) {
        // SAF was enabled but permission was revoked
        await this.privateCfg.save({ ...privateCfg, safFolderUri: undefined });
        return false;
      }
      return true;
    }
    return false;
  }

  async setupSaf(): Promise<string | undefined> {
    try {
      const uri = await SafService.selectFolder();
      const privateCfg = await this.privateCfg.load();
      await this.privateCfg.save({
        ...privateCfg,
        safFolderUri: uri,
      });
      return uri;
    } catch (error) {
      console.error('Failed to setup SAF:', error);
      return undefined;
    }
  }

  async setPrivateCfg(privateCfg: LocalFileSyncPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFilePath(targetPath: string): Promise<string> {
    return targetPath;
  }
}
