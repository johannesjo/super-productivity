// src/app/pfapi/api/sync/providers/local-file-sync/capacitor-file-adapter.ts
import { Directory } from '@capacitor/filesystem';
import { LocalFileSyncBase } from './local-file-sync-base';
import { CapacitorFileAdapter } from './capacitor-file-adapter';
import { PrivateCfgByProviderId } from '../../../pfapi.model';
import { SyncProviderId } from '../../../pfapi.const';

export class LocalFileSyncAndroid extends LocalFileSyncBase {
  constructor(public directory = Directory.Documents) {
    super(new CapacitorFileAdapter(directory));
  }

  async isReady(): Promise<boolean> {
    return true;
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
