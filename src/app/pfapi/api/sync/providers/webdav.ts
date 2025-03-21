import { SyncProviderServiceInterface } from '../sync-provider.interface';
import { SyncProviderId } from '../../pfapi.const';
import { WebdavApi } from './webdav-api';
import { SyncProviderCredentialsStore } from '../sync-provider-credentials-store';
import { WebDavHeadResponse } from '../../../../imex/sync/web-dav/web-dav.model';
import {
  InvalidDataError,
  NoEtagError,
  NoRemoteDataError,
  NoRevError,
} from '../../errors/errors';
import { pfLog } from '../../util/log';

// TODO check all
// import {
//   AuthFailError,
//   InvalidDataError,
//   NoRemoteDataError,
//   NoRevError,
// } from '../../errors/errors';

export interface WebdavCfg {
  bla?: string;
}

export interface WebdavCredentials {
  baseUrl: string;
  userName: string;
  password: string;
  syncFolderPath: string;
}

export class Webdav implements SyncProviderServiceInterface<WebdavCredentials> {
  readonly id: SyncProviderId = SyncProviderId.WebDAV;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  private readonly _api: WebdavApi;
  private readonly _appKey: string;
  private readonly _basePath: string;

  public credentialsStore!: SyncProviderCredentialsStore<WebdavCredentials>;

  constructor(cfg: WebdavCfg) {
    this._api = new WebdavApi(this);
  }

  async isReady(): Promise<boolean> {
    const credentials = await this.credentialsStore.load();
    return !!(
      credentials &&
      credentials.userName &&
      credentials.baseUrl &&
      credentials.syncFolderPath &&
      credentials.password
    );
  }

  async setCredentials(credentials: WebdavCredentials): Promise<void> {
    await this.credentialsStore.save(credentials);
  }

  async getFileRevAndLastClientUpdate(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    const cfg = await this.credentialsStore.load();

    try {
      const meta = await this._api.getFileMetaData(this._getFilePath(targetPath, cfg));
      // const d = new Date(meta['last-modified']);
      return {
        rev: this._getRevFromMeta(meta),
      };
    } catch (e: any) {
      const isAxiosError = !!(e?.response && e.response.status);
      if ((isAxiosError && e.response.status === 404) || e.status === 404) {
        throw new NoRemoteDataError(targetPath);
      }
      throw e;
    }
  }

  async uploadFile(
    targetPath: string,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<{ rev: string }> {
    const cfg = await this.credentialsStore.load();
    const filePath = this._getFilePath(targetPath, cfg);
    try {
      await this._api.upload({
        path: filePath,
        data: dataStr,
      });
    } catch (e) {
      // TODO check if this is enough
      if (e?.toString?.().includes('404')) {
        // folder might not exist, so we try to create it
        await this._api.createFolder({
          folderPath: cfg.syncFolderPath as string,
        });
        await this._api.upload({
          path: filePath,
          data: dataStr,
        });
      }
      throw e;
    }
    const fileMeta = await this._api.getFileMetaData(filePath);
    if (!fileMeta.rev) {
      throw new NoRevError();
    }

    return {
      rev: this._getRevFromMeta(fileMeta),
    };
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this.credentialsStore.load();
    const filePath = this._getFilePath(targetPath, cfg);
    const r = await this._api.download({
      path: filePath,
      localRev,
    });

    if (!r) {
      throw new NoRemoteDataError(targetPath);
    }
    if (typeof r !== 'string') {
      throw new InvalidDataError(r);
    }

    const fileMeta = await this._api.getFileMetaData(filePath);
    if (!fileMeta.rev) {
      throw new NoRevError();
    }

    return {
      rev: this._getRevFromMeta(fileMeta),
      dataStr: r,
    };
  }

  async removeFile(targetPath: string): Promise<void> {
    const cfg = await this.credentialsStore.load();
    try {
      await this._api.remove(this._getFilePath(targetPath, cfg));
    } catch (e) {
      throw e;
    }
    // TODO error handling
  }

  private _getRevFromMeta(fileMeta: WebDavHeadResponse): string {
    if (typeof fileMeta?.etag !== 'string') {
      console.warn('No etag for WebDAV, using instead: ', {
        etag: fileMeta.etag,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'oc-etag': fileMeta['oc-etag'],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'last-modified': fileMeta['last-modified'],
      });
    }
    const rev = fileMeta.etag || fileMeta['oc-etag'] || fileMeta['last-modified'];
    if (!rev) {
      throw new NoEtagError(fileMeta);
    }
    return this._cleanRev(rev);
  }

  private _cleanRev(rev: string): string {
    const result = rev.replace(/"/g, '').replace(/^W\//, '');
    pfLog(3, `${Webdav.name}.${this._cleanRev.name}()`, result);
    return result;
  }

  private _getFilePath(targetPath: string, cfg: WebdavCredentials): string {
    return `${cfg.syncFolderPath as string}/${targetPath}.json`;
  }
}
