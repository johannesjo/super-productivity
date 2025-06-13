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
    const isConfigured = !!(
      privateCfg &&
      privateCfg.userName &&
      privateCfg.baseUrl &&
      privateCfg.syncFolderPath &&
      privateCfg.password
    );

    if (isConfigured) {
      // Ensure the sync folder structure exists
      try {
        await this._ensureSyncFolderExists(privateCfg);
      } catch (e) {
        pfLog(0, `${Webdav.L}.isReady() failed to ensure sync folder exists`, e);
        // Don't fail isReady check, this will be handled during actual sync
      }
    }

    return isConfigured;
  }

  async setPrivateCfg(privateCfg: WebdavPrivateCfg): Promise<void> {
    await this.privateCfg.save(privateCfg);
  }

  async getFileRev(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    const { cfg, filePath } = await this._getConfigAndPath(targetPath);

    try {
      const meta = await this._api.getFileMeta(filePath, localRev);
      return { rev: meta.etag };
    } catch (e) {
      // For metadata files, we expect them to not exist initially
      if (e instanceof RemoteFileNotFoundAPIError && targetPath === '__meta_') {
        pfLog(
          2,
          `${Webdav.L}.getFileRev() metadata file not found (expected for initial sync)`,
        );
        throw e;
      }
      await this._handleDirectoryCreationOnError(e, targetPath, cfg, 'getFileRev');
      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const { cfg, filePath } = await this._getConfigAndPath(targetPath);

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
    const { filePath } = await this._getConfigAndPath(targetPath);

    try {
      // For initial sync, we might have a localRev but the remote file doesn't exist yet
      // In this case, we should try to download without the localRev first
      let downloadResult;

      try {
        downloadResult = await this._api.download({
          path: filePath,
          localRev,
        });
      } catch (e: any) {
        // If we get a "not modified" error but it's the meta file, try without localRev
        // This handles the case where local has a rev but remote doesn't exist
        if (e?.message?.includes('not modified') && targetPath === '__meta_') {
          pfLog(
            2,
            `${Webdav.L}.downloadFile() retrying metadata download without localRev`,
          );
          downloadResult = await this._api.download({
            path: filePath,
            localRev: null,
          });
        } else {
          throw e;
        }
      }

      const { rev, dataStr } = downloadResult;
      if (!dataStr) {
        throw new InvalidDataSPError(targetPath);
      }
      if (typeof rev !== 'string') {
        throw new NoRevAPIError();
      }
      return { rev, dataStr };
    } catch (e) {
      // For metadata files, we expect them to not exist initially
      if (e instanceof RemoteFileNotFoundAPIError && targetPath === '__meta_') {
        pfLog(
          2,
          `${Webdav.L}.downloadFile() metadata file not found (expected for initial sync)`,
        );
      }
      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    const { filePath } = await this._getConfigAndPath(targetPath);
    await this._api.remove(filePath);
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

  private async _getConfigAndPath(
    targetPath: string,
  ): Promise<{ cfg: WebdavPrivateCfg; filePath: string }> {
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    return { cfg, filePath };
  }

  private async _handleDirectoryCreationOnError(
    error: any,
    targetPath: string,
    cfg: WebdavPrivateCfg,
    methodName: string,
  ): Promise<void> {
    if (error instanceof RemoteFileNotFoundAPIError) {
      pfLog(2, `${Webdav.L}.${methodName}() file not found, ensuring directories exist`);
      try {
        await this._ensureFolderExists(targetPath, cfg);
        pfLog(2, `${Webdav.L}.${methodName}() created directory structure`);
      } catch (folderError) {
        pfLog(1, `${Webdav.L}.${methodName}() failed to create directories`, folderError);
      }
    }
  }

  private async _ensureFolderExists(
    targetPath: string,
    cfg: WebdavPrivateCfg,
  ): Promise<void> {
    // Get the full file path to create directory structure for
    const fullFilePath = this._getFilePath(targetPath, cfg);

    // Extract directory parts from the full file path
    const pathParts = fullFilePath.split('/').filter((part) => part.length > 0);

    // Don't process if it's a root-level file
    if (pathParts.length <= 1) {
      return;
    }

    // Remove the filename to get directory path parts
    const dirParts = pathParts.slice(0, -1);

    // Create directories progressively from root to parent
    for (let i = 1; i <= dirParts.length; i++) {
      const currentPath = dirParts.slice(0, i).join('/');

      try {
        // First check if directory already exists to avoid unnecessary creation attempts
        const dirExists = await this._api.checkFolderExists(currentPath);
        if (dirExists) {
          pfLog(
            2,
            `${Webdav.L}._ensureFolderExists() directory already exists: ${currentPath}`,
          );
          continue;
        }

        pfLog(
          2,
          `${Webdav.L}._ensureFolderExists() attempting to create directory: ${currentPath}`,
        );
        await this._api.createFolder({ folderPath: currentPath });
        pfLog(
          2,
          `${Webdav.L}._ensureFolderExists() successfully created directory: ${currentPath}`,
        );
      } catch (error: any) {
        pfLog(
          1,
          `${Webdav.L}._ensureFolderExists() error creating directory: ${currentPath}`,
          error,
        );

        // Handle specific error cases
        if (error?.status === 403 || error?.status === 401) {
          // Permission errors - check if directory exists first
          try {
            const dirExists = await this._api.checkFolderExists(currentPath);
            if (dirExists) {
              pfLog(
                2,
                `${Webdav.L}._ensureFolderExists() directory exists despite 403 error: ${currentPath}`,
              );
              continue; // Directory exists, continue with next one
            }
          } catch (checkError) {
            pfLog(
              1,
              `${Webdav.L}._ensureFolderExists() failed to check directory existence: ${currentPath}`,
              checkError,
            );
          }

          // If directory doesn't exist and we can't create it, this is a real permission error
          pfLog(
            0,
            `${Webdav.L}._ensureFolderExists() permission denied for: ${currentPath}`,
          );
          throw new Error(`Permission denied creating directory: ${currentPath}`);
        } else if (error?.status === 405) {
          // Method not allowed - MKCOL not supported, this is handled in createFolder
          pfLog(
            2,
            `${Webdav.L}._ensureFolderExists() MKCOL not supported for ${currentPath}`,
          );
        } else if (
          error?.message?.includes('already exists') ||
          error?.status === 409 ||
          error?.status === 405
        ) {
          // Directory already exists or conflict, continue
          pfLog(
            2,
            `${Webdav.L}._ensureFolderExists() directory exists or conflict for: ${currentPath}`,
          );
        } else {
          // Other errors - log but continue, let the final operation fail with a clearer error
          pfLog(
            1,
            `${Webdav.L}._ensureFolderExists() ignoring error for ${currentPath}`,
            error,
          );
        }
      }
    }
  }

  private async _ensureSyncFolderExists(cfg: WebdavPrivateCfg): Promise<void> {
    // Parse the sync folder path to get all directory levels
    const syncPath = cfg.syncFolderPath;
    const pathParts = syncPath.split('/').filter((part) => part.length > 0);

    // If we have an extra path (e.g., 'DEV'), add it to the parts
    if (this._extraPath) {
      pathParts.push(...this._extraPath.split('/').filter((part) => part.length > 0));
    }

    // Create each directory level progressively
    for (let i = 1; i <= pathParts.length; i++) {
      const currentPath = pathParts.slice(0, i).join('/');

      try {
        const exists = await this._api.checkFolderExists(currentPath);
        if (!exists) {
          pfLog(
            2,
            `${Webdav.L}._ensureSyncFolderExists() creating folder: ${currentPath}`,
          );
          await this._api.createFolder({ folderPath: currentPath });
        }
      } catch (error: any) {
        if (error?.status === 405 || error?.status === 409) {
          // Directory might already exist or MKCOL not supported
          pfLog(
            2,
            `${Webdav.L}._ensureSyncFolderExists() folder might already exist: ${currentPath}`,
          );
        } else {
          pfLog(
            0,
            `${Webdav.L}._ensureSyncFolderExists() error creating folder: ${currentPath}`,
            error,
          );
        }
      }
    }
  }
}
