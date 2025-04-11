// src/app/pfapi/api/sync/providers/local-file-sync/capacitor-file-adapter.ts
import { Directory } from '@capacitor/filesystem';
import { LocalFileSyncBase } from './local-file-sync-base';
import { CapacitorFileAdapter } from './capacitor-file-adapter';

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
    return targetPath;
  }
}
