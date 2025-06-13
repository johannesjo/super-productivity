import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { WebdavApi } from './webdav-api';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import {
  InvalidDataSPError,
  MissingCredentialsSPError,
  NoRevAPIError,
} from '../../../errors/errors';
import { SyncProviderPrivateCfgBase } from '../../../pfapi.model';

export interface WebdavPrivateCfg extends SyncProviderPrivateCfgBase {
  baseUrl: string;
  userName: string;
  password: string;
  syncFolderPath: string;
}

export class Webdav implements SyncProviderServiceInterface<SyncProviderId.WebDAV> {
  private static readonly L = 'Webdav';

  readonly id = SyncProviderId.WebDAV;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  private readonly _api: WebdavApi = new WebdavApi(() => this._cfgOrError());

  public privateCfg!: SyncProviderPrivateCfgStore<SyncProviderId.WebDAV>;

  constructor(private _extraPath?: string) {}

  async isReady(): Promise<boolean> {
    const privateCfg = await this.privateCfg.load();
    return !!(
      privateCfg &&
      privateCfg.userName &&
      privateCfg.baseUrl &&
      privateCfg.syncFolderPath &&
      privateCfg.password
    );
  }

  async setPrivateCfg(privateCfg: WebdavPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFileRev(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    const { filePath } = await this._getConfigAndPath(targetPath);
    const meta = await this._api.getFileMeta(filePath, localRev);
    return { rev: meta.etag };
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const { filePath } = await this._getConfigAndPath(targetPath);

    const etag = await this._api.upload({
      path: filePath,
      data: dataStr,
      isOverwrite: isForceOverwrite,
      expectedEtag: isForceOverwrite ? null : localRev,
    });

    if (!etag) {
      throw new NoRevAPIError();
    }

    return { rev: etag };
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const { filePath } = await this._getConfigAndPath(targetPath);

    // For metadata file, don't send localRev if it might not exist remotely
    const effectiveLocalRev = targetPath === '__meta_' && localRev ? null : localRev;

    const download = async (
      useLocalRev: string | null,
    ): Promise<{ rev: string; dataStr: string }> => {
      const { rev, dataStr } = await this._api.download({
        path: filePath,
        localRev: useLocalRev,
      });

      if (!dataStr && dataStr !== '') {
        throw new InvalidDataSPError(targetPath);
      }
      if (typeof rev !== 'string') {
        throw new NoRevAPIError();
      }

      return { rev, dataStr };
    };

    try {
      return await download(effectiveLocalRev);
    } catch (e: any) {
      // Handle 304 Not Modified responses by downloading without conditional headers
      if (e?.status === 304) {
        return await download(null);
      }
      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    const { filePath } = await this._getConfigAndPath(targetPath);
    await this._api.remove(filePath);
  }

  private _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    const parts = [cfg.syncFolderPath];
    if (this._extraPath) {
      parts.push(this._extraPath);
    }
    parts.push(targetPath);
    return parts.join('/').replace(/\/+/g, '/');
  }

  private async _cfgOrError(): Promise<WebdavPrivateCfg> {
    const cfg = await this.privateCfg.load();
    if (!cfg) {
      throw new MissingCredentialsSPError();
    }
    return cfg;
  }

  private async _getConfigAndPath(
    targetPath: string,
  ): Promise<{ cfg: WebdavPrivateCfg; filePath: string }> {
    const cfg = await this._cfgOrError();
    return { cfg, filePath: this._getFilePath(targetPath, cfg) };
  }
}
