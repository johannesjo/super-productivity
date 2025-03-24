import { SyncProviderServiceInterface } from '../../sync-provider.interface';
import { SyncProviderId } from '../../../pfapi.const';
import { WebdavApi } from './webdav-api';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import {
  AuthNotConfiguredError,
  InvalidDataError,
  NoEtagError,
  NoRemoteDataError,
  NoRevError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';
import { FileStat } from 'webdav/dist/node/types';

// TODO check all
// import {
//   AuthFailError,
//   InvalidDataError,
//   NoRemoteDataError,
//   NoRevError,
// } from '../../errors/errors';

export interface WebdavPrivateCfg {
  baseUrl: string;
  userName: string;
  password: string;
  syncFolderPath: string;
}

export class Webdav implements SyncProviderServiceInterface<WebdavPrivateCfg> {
  readonly id: SyncProviderId = SyncProviderId.WebDAV;
  readonly isUploadForcePossible = false;
  readonly maxConcurrentRequests = 10;

  private readonly _api: WebdavApi;

  public privateCfg!: SyncProviderPrivateCfgStore<WebdavPrivateCfg>;

  constructor() {
    this._api = new WebdavApi(() => this._cfgOrError());
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
    await this.privateCfg.save(privateCfg);
  }

  async getFileRev(
    targetPath: string,
    localRev: string | null,
  ): Promise<{ rev: string }> {
    const cfg = await this._cfgOrError();
    try {
      const meta = await this._api.getFileMeta(this._getFilePath(targetPath, cfg));
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
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    try {
      // TODO get rev from upload directly
      await this._api.upload({
        path: filePath,
        data: dataStr,
        isOverwrite: isForceOverwrite,
      });
    } catch (e) {
      // TODO check if this is enough
      // TODO re-implement but for folders only
      // if (e?.toString?.().includes('404')) {
      //   // folder might not exist, so we try to create it
      //   await this._api.createFolder({
      //     folderPath: cfg.syncFolderPath as string,
      //   });
      //   await this._api.upload({
      //     path: filePath,
      //     data: dataStr,
      //   });
      // }
      throw e;
    }
    const rev = this._getRevFromMeta(await this._api.getFileMeta(filePath));
    if (!rev) {
      throw new NoRevError();
    }
    return {
      rev,
    };
  }

  async downloadFile(
    targetPath: string,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this._cfgOrError();
    const filePath = this._getFilePath(targetPath, cfg);
    try {
      const { rev, dataStr } = await this._api.download({
        path: filePath,
        localRev,
      });
      if (!dataStr) {
        throw new NoRemoteDataError(targetPath);
      }
      if (typeof rev !== 'string') {
        throw new InvalidDataError(rev);
      }
      return { rev, dataStr };
    } catch (e) {
      console.log(e, Object.keys(e as any), (e as any)?.status, (e as any)?.response);

      if ((e as any)?.status === 404) {
        throw new NoRemoteDataError(targetPath);
      }

      throw e;
    }
  }

  async removeFile(targetPath: string): Promise<void> {
    const cfg = await this._cfgOrError();
    try {
      await this._api.remove(this._getFilePath(targetPath, cfg));
    } catch (e) {
      throw e;
    }
    // TODO error handling
  }

  private _getRevFromMeta(fileMeta: FileStat): string {
    const d = (fileMeta as any)?.data || fileMeta;
    if (typeof d?.etag !== 'string') {
      console.warn('No etag for WebDAV, using instead: ', {
        d,
        etag: d.etag,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'oc-etag': d['oc-etag'],
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'last-modified': d['last-modified'],
      });
    }
    const rev = d.etag || d['oc-etag'] || d['last-modified'];
    if (!rev) {
      throw new NoEtagError(fileMeta);
    }
    return this._cleanRev(rev);
  }

  private _cleanRev(rev: string): string {
    const result = rev
      //
      .replace(/\//g, '')
      .replace(/"/g, '');

    pfLog(3, `${Webdav.name}.${this._cleanRev.name}()`, result);
    return result;
  }

  private _getFilePath(targetPath: string, cfg: WebdavPrivateCfg): string {
    return `${cfg.syncFolderPath}/${targetPath}`;
  }

  private async _cfgOrError(): Promise<WebdavPrivateCfg> {
    const cfg = await this.privateCfg.load();
    if (!cfg) {
      throw new AuthNotConfiguredError();
    }
    return cfg;
  }
}
