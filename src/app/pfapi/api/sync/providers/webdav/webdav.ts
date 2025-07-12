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

export interface WebdavServerCapabilities {
  /** Whether the server supports ETag headers for versioning */
  supportsETags: boolean;
  /** Whether the server supports WebDAV If headers (RFC 4918) */
  supportsIfHeader: boolean;
  /** Whether the server supports WebDAV LOCK/UNLOCK operations */
  supportsLocking: boolean;
  /** Whether the server supports Last-Modified headers for versioning */
  supportsLastModified: boolean;
}

export interface WebdavPrivateCfg extends SyncProviderPrivateCfgBase {
  baseUrl: string;
  userName: string;
  password: string;
  syncFolderPath: string;

  /**
   * Server capabilities configuration. If not provided, capabilities will be
   * detected automatically on first use. Providing this configuration can
   * improve performance by skipping detection and ensure consistent behavior.
   *
   * Recommended settings for common servers:
   * - Nextcloud/ownCloud: { supportsETags: true, supportsIfHeader: true, supportsLocking: true, supportsLastModified: true }
   * - Apache mod_dav: { supportsETags: true, supportsIfHeader: false, supportsLocking: true, supportsLastModified: true }
   * - Basic WebDAV: { supportsETags: false, supportsIfHeader: false, supportsLocking: false, supportsLastModified: true }
   */
  serverCapabilities?: WebdavServerCapabilities;

  /**
   * Force the use of Last-Modified headers instead of ETags, even if ETags are available.
   * This can be useful for testing fallback behavior or working with servers that have
   * unreliable ETag implementations.
   */
  preferLastModified?: boolean;

  /**
   * Compatibility mode for servers with limited WebDAV support.
   * When enabled, disables conditional operations and safe creation mechanisms.
   * Use only for very basic WebDAV servers that don't support any conditional headers.
   */
  basicCompatibilityMode?: boolean;

  /**
   * Maximum number of retry attempts for capability detection and fallback operations.
   * Default: 2
   */
  maxRetries?: number;
}

/**
 * Server type enum for common WebDAV implementations
 */
export enum WebdavServerType {
  NEXTCLOUD = 'nextcloud',
  OWNCLOUD = 'owncloud',
  APACHE_MOD_DAV = 'apache_mod_dav',
  NGINX_DAV = 'nginx_dav',
  BASIC_WEBDAV = 'basic_webdav',
  CUSTOM = 'custom',
}

/**
 * Helper function to get recommended server capabilities for common WebDAV server types
 */
export const getRecommendedServerCapabilities = (
  serverType: WebdavServerType,
): WebdavServerCapabilities => {
  switch (serverType) {
    case WebdavServerType.NEXTCLOUD:
    case WebdavServerType.OWNCLOUD:
      return {
        supportsETags: true,
        supportsIfHeader: true,
        supportsLocking: true,
        supportsLastModified: true,
      };

    case WebdavServerType.APACHE_MOD_DAV:
      return {
        supportsETags: true,
        supportsIfHeader: false, // mod_dav has limited If header support
        supportsLocking: true,
        supportsLastModified: true,
      };

    case WebdavServerType.NGINX_DAV:
      return {
        supportsETags: false, // nginx dav module has limited ETag support
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      };

    case WebdavServerType.BASIC_WEBDAV:
      return {
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      };

    case WebdavServerType.CUSTOM:
    default:
      // Return null to trigger auto-detection
      return {
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: false,
      };
  }
};

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

    try {
      const { rev, dataStr } = await this._api.download({
        path: filePath,
        localRev: effectiveLocalRev,
      });

      if (!dataStr && dataStr !== '') {
        throw new InvalidDataSPError(targetPath);
      }
      if (typeof rev !== 'string') {
        throw new NoRevAPIError();
      }

      return { rev, dataStr };
    } catch (e: any) {
      // Handle 304 Not Modified by retrying without localRev
      if (e?.status === 304) {
        const { rev, dataStr } = await this._api.download({
          path: filePath,
          localRev: null,
        });

        if (!dataStr && dataStr !== '') {
          throw new InvalidDataSPError(targetPath);
        }
        if (typeof rev !== 'string') {
          throw new NoRevAPIError();
        }

        return { rev, dataStr };
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
    const filePath = this._getFilePath(targetPath, cfg);
    return { cfg, filePath };
  }
}
