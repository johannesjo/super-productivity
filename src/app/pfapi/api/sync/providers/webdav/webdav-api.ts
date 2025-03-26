import { Webdav, WebdavPrivateCfg } from './webdav';
import {
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
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
    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
    });

    if (!isOverwrite) {
      headers.append('If-None-Match', '*');
    }

    headers.append('Authorization', this._getAuthHeader(cfg));

    const response = await fetch(this._getUrl(path, cfg), {
      method: 'PUT',
      headers,
      body: data,
    });

    if (response.status === 412) {
      // console.log(response);
      throw new FileExistsAPIError();
    }

    if (!response.ok) {
      throw new HttpNotOkAPIError(response);
    }
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    const cfg = await this._getCfgOrError();

    const headers = new Headers();
    headers.append('Authorization', this._getAuthHeader(cfg));

    const response = await fetch(this._getUrl(folderPath, cfg), {
      method: 'MKCOL',
      headers,
    });

    if (!response.ok) {
      throw new HttpNotOkAPIError(response);
    }
  }

  async getFileMeta(path: string): Promise<any> {
    const cfg = await this._getCfgOrError();

    const headers = new Headers();
    headers.append('Authorization', this._getAuthHeader(cfg));

    // Use HEAD method instead of PROPFIND
    const response = await fetch(this._getUrl(path, cfg), {
      method: 'HEAD',
      headers,
    });

    if (!response.ok) {
      throw new HttpNotOkAPIError(response);
    }

    // Create case-insensitive header object
    const headerObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerObj[key.toLowerCase()] = value;
    });

    // Get etag from response headers
    const etag = headerObj.etag || '';

    // Build the file stat object
    const fileMeta = {
      filename: path.split('/').pop() || '',
      basename: path.split('/').pop() || '',
      lastmod: headerObj['last-modified'] || '',
      size: parseInt(headerObj['content-length'] || '0', 10),
      type: 'file',
      etag: etag,
      data: {
        ...headerObj,
      },
    };

    // Clean the etag if present
    if (fileMeta.etag) {
      fileMeta.etag = this._cleanRev(fileMeta.etag);
    }

    return fileMeta;
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this._getCfgOrError();

    const headers = new Headers();
    headers.append('Authorization', this._getAuthHeader(cfg));

    if (localRev) {
      headers.append('If-None-Match', `${localRev}`);
    }

    const response = await fetch(this._getUrl(path, cfg), {
      method: 'GET',
      headers,
    });

    if (response.status === 412) {
      throw new Error('If-None-Match was matched');
    }

    if (response.status === 304) {
      throw new Error('Not modified');
    }

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
  }

  async remove(filePath: string): Promise<void> {
    const cfg = await this._getCfgOrError();

    const headers = new Headers();
    headers.append('Authorization', this._getAuthHeader(cfg));

    const response = await fetch(this._getUrl(filePath, cfg), {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Remove file failed: ${response.status} ${response.statusText}`);
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
}
