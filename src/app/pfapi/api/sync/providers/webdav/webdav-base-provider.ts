import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { PrivateCfgByProviderId } from '../../../pfapi.model';
import { SyncProviderId } from '../../../pfapi.const';
import { WebdavApi } from './webdav-api';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import {
  InvalidDataSPError,
  MissingCredentialsSPError,
  NoRevAPIError,
} from '../../../errors/errors';
import { WebdavPrivateCfg } from './webdav.model';
import { SyncLog } from '../../../../../core/log';

/**
 * Base class for WebDAV-based sync providers.
 * Provides common functionality for uploading, downloading, and managing files via WebDAV.
 * Extend this class to create specialized WebDAV providers (e.g., SuperSync).
 */
export abstract class WebdavBaseProvider<
  T extends SyncProviderId.WebDAV | SyncProviderId.SuperSync,
> implements SyncProviderServiceInterface<T>
{
  abstract readonly id: T;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  protected readonly _api: WebdavApi;
  public privateCfg!: SyncProviderPrivateCfgStore<T>;

  constructor(protected _extraPath?: string) {
    this._api = new WebdavApi(() => this._cfgOrError());
  }

  /**
   * Returns a label for logging purposes.
   * Override in subclasses for more specific logging.
   */
  protected get logLabel(): string {
    return 'WebdavBaseProvider';
  }

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
    await this.privateCfg.setComplete(privateCfg as PrivateCfgByProviderId<T>);
  }

  async getFileRev(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    const { filePath } = await this._getConfigAndPath(targetPath);
    const meta = await this._api.getFileMeta(filePath, localRev, true);
    return { rev: meta.lastmod };
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    SyncLog.debug(this.logLabel, 'uploadFile', {
      targetPath,
      localRev,
      isForceOverwrite,
    });
    const { filePath } = await this._getConfigAndPath(targetPath);

    const result = await this._api.upload({
      path: filePath,
      data: dataStr,
      isForceOverwrite: isForceOverwrite,
      expectedRev: isForceOverwrite ? null : localRev,
    });

    if (!result.rev) {
      throw new NoRevAPIError();
    }

    return { rev: result.rev };
  }

  async downloadFile(
    targetPath: string,
  ): Promise<{ rev: string; legacyRev?: string; dataStr: string }> {
    SyncLog.debug(this.logLabel, 'downloadFile', { targetPath });
    const { filePath } = await this._getConfigAndPath(targetPath);

    const result = await this._api.download({
      path: filePath,
    });

    if (!result.dataStr && result.dataStr !== '') {
      throw new InvalidDataSPError(targetPath);
    }
    if (typeof result.rev !== 'string') {
      throw new NoRevAPIError();
    }

    return { rev: result.rev, legacyRev: result.legacyRev, dataStr: result.dataStr };
  }

  async removeFile(targetPath: string): Promise<void> {
    SyncLog.debug(this.logLabel, 'removeFile', { targetPath });
    const { filePath } = await this._getConfigAndPath(targetPath);
    await this._api.remove(filePath);
  }

  protected _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    const parts = cfg.syncFolderPath ? [cfg.syncFolderPath] : [];
    if (this._extraPath) {
      parts.push(this._extraPath);
    }
    parts.push(targetPath);
    return parts.join('/').replace(/\/+/g, '/');
  }

  protected async _cfgOrError(): Promise<WebdavPrivateCfg> {
    const cfg = await this.privateCfg.load();
    if (!cfg) {
      throw new MissingCredentialsSPError();
    }
    return cfg;
  }

  protected async _getConfigAndPath(
    targetPath: string,
  ): Promise<{ cfg: WebdavPrivateCfg; filePath: string }> {
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    return { cfg, filePath };
  }
}
