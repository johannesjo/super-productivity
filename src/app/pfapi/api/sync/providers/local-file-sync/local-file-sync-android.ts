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
    if (privateCfg?.safEnabled) {
      const hasPermission = await SafService.checkPermission(privateCfg.safFolderUri);
      if (!hasPermission) {
        // SAF was enabled but permission was revoked
        await this.privateCfg.save({ ...privateCfg, safEnabled: false });
        return false;
      }
      return true;
    }
    return false;
  }

  async setupSaf(): Promise<boolean> {
    try {
      const uri = await SafService.selectFolder();
      await this.privateCfg.save({
        safFolderUri: uri,
        safEnabled: true,
      });
      return true;
    } catch (error) {
      console.error('Failed to setup SAF:', error);
      return false;
    }
  }

  async isSafEnabled(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    return !!privateCfg?.safEnabled;
  }

  async disableSaf(): Promise<void> {
    await this.privateCfg.save({
      safFolderUri: undefined,
      safEnabled: false,
    });
  }

  async setPrivateCfg(privateCfg: LocalFileSyncPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFilePath(targetPath: string): Promise<string> {
    return targetPath;
  }
}
