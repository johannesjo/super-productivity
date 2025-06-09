import { Directory } from '@capacitor/filesystem';
import { LocalFileSyncBase } from './local-file-sync-base';
import { PrivateCfgByProviderId } from '../../../pfapi.model';
import { SyncProviderId } from '../../../pfapi.const';
import { SafService } from './droid-saf/saf.service';
import { SafFileAdapter } from './droid-saf/saf-file-adapter';

export class LocalFileSyncAndroid extends LocalFileSyncBase {
  constructor(public directory = Directory.Documents) {
    super(new SafFileAdapter());
  }

  async isReady(): Promise<boolean> {
    // Check if SAF is enabled and has valid permissions
    if (await SafService.isEnabled()) {
      const hasPermission = await SafService.checkPermission();
      if (!hasPermission) {
        // SAF was enabled but permission was revoked
        await SafService.setEnabled(false);
        return false;
      }
    }
    return true;
  }

  async setupSaf(): Promise<boolean> {
    try {
      const uri = await SafService.selectFolder();
      alert(uri);
      await SafService.setEnabled(true);
      return true;
    } catch (error) {
      console.error('Failed to setup SAF:', error);
      return false;
    }
  }

  async isSafEnabled(): Promise<boolean> {
    return await SafService.isEnabled();
  }

  async disableSaf(): Promise<void> {
    await SafService.clearFolderUri();
  }

  async setPrivateCfg(
    privateCfg: PrivateCfgByProviderId<SyncProviderId.LocalFile>,
  ): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFilePath(targetPath: string): Promise<string> {
    return targetPath;
  }
}
