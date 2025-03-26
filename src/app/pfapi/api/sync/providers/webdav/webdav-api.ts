import { Webdav, WebdavPrivateCfg } from './webdav';
import {
  AuthFailSPError,
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';

/* eslint-disable @typescript-eslint/naming-convention */

export class WebdavApi {
  private _getCfgOrError: () => Promise<WebdavPrivateCfg>;

  constructor(_getCfgOrError: () => Promise<WebdavPrivateCfg>) {
    this._getCfgOrError = _getCfgOrError;
  }

  async upload({
    data,
    path,
    isOverwrite,
  }: {
    data: string;
    path: string;
    isOverwrite?: boolean;
  }): Promise<void> {
    const cfg = await this._getCfgOrError();
    const headers = this._geReqtHeaders(cfg, isOverwrite ? null : '*');
    headers.append('Content-Type', 'application/octet-stream');
    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method: 'PUT',
        headers,
        body: data,
      });
      if (response.status === 412) {
        throw new FileExistsAPIError();
      }

      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }
    } catch (e) {
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  async getFileMeta(path: string, localRev: string | null): Promise<any> {
    const cfg = await this._getCfgOrError();

    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method: 'HEAD',
        headers: this._geReqtHeaders(cfg, localRev),
      });
      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }

      // Create case-insensitive header object
      const responseHeaderObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaderObj[key.toLowerCase()] = value;
      });

      // Get etag from response headers
      const etag = responseHeaderObj.etag || '';

      // Build the file stat object
      const fileMeta = {
        filename: path.split('/').pop() || '',
        basename: path.split('/').pop() || '',
        lastmod: responseHeaderObj['last-modified'] || '',
        size: parseInt(responseHeaderObj['content-length'] || '0', 10),
        type: 'file',
        etag: etag,
        data: {
          ...responseHeaderObj,
        },
      };

      // Clean the etag if present
      if (fileMeta.etag) {
        fileMeta.etag = this._cleanRev(fileMeta.etag);
      }

      return fileMeta;
    } catch (e) {
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this._getCfgOrError();
    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method: 'GET',
        headers: this._geReqtHeaders(cfg, localRev),
      });
      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }
      const dataStr = await response.text();

      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });

      return {
        rev: this.getRevFromMeta(headerObj),
        dataStr,
      };
    } catch (e) {
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  async remove(path: string): Promise<void> {
    const cfg = await this._getCfgOrError();

    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method: 'DELETE',
        headers: this._geReqtHeaders(cfg),
      });

      if (!response.ok) {
        throw new Error(`Remove file failed: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  getRevFromMeta(fileMeta: unknown | Headers): string {
    const d = (fileMeta as any)?.data || fileMeta;
    let etagVal = d?.etag;
    if (typeof etagVal !== 'string') {
      const eTagAlternatives = ['oc-etag', 'last-modified'];
      const propToUseInstead = eTagAlternatives.find((alt) => alt in d);
      console.warn('No etag for WebDAV, using instead: ', propToUseInstead, {
        d,
        propToUseInstead,
        etag: d.etag,
        'oc-etag': d['oc-etag'],
        'last-modified': d['last-modified'],
      });
      if (!propToUseInstead || !d[propToUseInstead]) {
        throw new NoEtagAPIError(fileMeta);
      }
      etagVal = d[propToUseInstead];
    }

    return this._cleanRev(etagVal);
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    const cfg = await this._getCfgOrError();
    try {
      const response = await fetch(this._getUrl(folderPath, cfg), {
        method: 'MKCOL',
        headers: this._geReqtHeaders(cfg),
      });

      if (!response.ok) {
        throw new HttpNotOkAPIError(response);
      }
    } catch (e) {
      this._checkCommonErrors(e, folderPath);
      throw e;
    }
  }

  private _geReqtHeaders(
    cfg: WebdavPrivateCfg,
    ifNoneMatch: string | null = null,
  ): Headers {
    const headers = new Headers();
    headers.append('Authorization', this._getAuthHeader(cfg));
    if (ifNoneMatch) {
      headers.append('If-None-Match', ifNoneMatch);
    }
    return headers;
  }

  private _cleanRev(rev: string): string {
    const result = rev
      .replace(/\//g, '')
      .replace(/"/g, '')
      .replace('&quot;', '')
      .replace('&quot;', '');

    pfLog(2, `${Webdav.name}.${this._cleanRev.name}()`, result);
    return result;
  }

  private _getUrl(path: string, cfg: WebdavPrivateCfg): string {
    return new URL(
      path,
      cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`,
    ).toString();
  }

  private _getAuthHeader(cfg: WebdavPrivateCfg): string {
    return `Basic ${btoa(`${cfg.userName}:${cfg.password}`)}`;
  }

  private _checkCommonErrors(e: any, targetPath: string): void {
    pfLog(1, `${Webdav.name} API ${targetPath}`, e);
    if ('status' in e) {
      if (e.status === 404) {
        throw new RemoteFileNotFoundAPIError(targetPath);
      }
      if (e.status === 401) {
        throw new AuthFailSPError('WebDav 401', targetPath);
      }
    }
  }
}
