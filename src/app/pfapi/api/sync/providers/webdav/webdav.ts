import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { WebdavApi } from './webdav-api';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import {
  InvalidDataSPError,
  MissingCredentialsSPError,
  NoRevAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';
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
    const cfg = await this._cfgOrError();
    const meta = await this._api.getFileMeta(
      this._getFilePath(targetPath, cfg),
      localRev,
    );
    return {
      rev: meta.etag,
    };
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    try {
      const rev = await this._api.upload({
        path: filePath,
        data: dataStr,
        isOverwrite: isForceOverwrite,
      });
      if (rev) {
        return { rev };
      }
    } catch (e) {
      pfLog(0, `${Webdav.L}.uploadFile() error during upload`, e);
      if (e instanceof RemoteFileNotFoundAPIError) {
        pfLog(2, `${Webdav.L}.uploadFile() creating parent folders and retrying`);
        try {
          // Create necessary parent folders
          await this._ensureFolderExists(targetPath, cfg);

          // Retry upload after folder creation
          await this._api.upload({
            path: filePath,
            data: dataStr,
            isOverwrite: isForceOverwrite,
          });
        } catch (retryError) {
          pfLog(0, `${Webdav.L}.uploadFile() retry failed`, retryError);
          throw retryError;
        }
      } else {
        throw e;
      }
    }
    const { etag } = await this._api.getFileMeta(filePath, null);
    if (!etag) {
      pfLog(0, `${Webdav.L}.uploadFile() no etag returned after upload`);
      throw new NoRevAPIError();
    }
    return { rev: etag };
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    const { rev, dataStr } = await this._api.download({
      path: filePath,
      localRev,
    });
    if (!dataStr) {
      throw new InvalidDataSPError(targetPath);
    }
    if (typeof rev !== 'string') {
      throw new NoRevAPIError();
    }
    return { rev, dataStr };
  }

  async removeFile(targetPath: string): Promise<void> {
    const cfg = await this._cfgOrError();
    await this._api.remove(this._getFilePath(targetPath, cfg));
  }

  private _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    if (this._extraPath) {
      return `${cfg.syncFolderPath}${this._extraPath}/${targetPath}`;
    }
    return `${cfg.syncFolderPath}/${targetPath}`;
  }

  private async _cfgOrError(): Promise<WebdavPrivateCfg> {
    const cfg = await this.privateCfg.load();
    if (!cfg) {
      throw new MissingCredentialsSPError();
    }
    return cfg;
  }

  private async _ensureFolderExists(
    targetPath: string,
    cfg: WebdavPrivateCfg,
  ): Promise<void> {
    // Extract the directory path from the target file path
    const pathParts = targetPath.split('/');
    pathParts.pop(); // Remove the filename part
    if (this._extraPath) {
      pathParts.unshift(this._extraPath);
    }

    if (pathParts.length === 0) {
      return; // No folder needed, file is at root level
    }

    // Create folder hierarchy as needed
    let currentPath = cfg.syncFolderPath;

    for (const part of pathParts) {
      currentPath = `${currentPath}/${part}`;

      try {
        await this._api.createFolder({ folderPath: currentPath });
        pfLog(2, `${Webdav.L}.ensureFolderExists() created folder`, currentPath);
      } catch (e: any) {
        // Ignore 405 Method Not Allowed (folder likely exists)
        // Ignore 409 Conflict (folder already exists)
        if (e?.status !== 405 && e?.status !== 409) {
          pfLog(0, `${Webdav.L}.ensureFolderExists() error creating folder`, {
            folderPath: currentPath,
            error: e,
          });
          throw e;
        }
      }
    }
  }
}
