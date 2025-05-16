import { WebdavPrivateCfg } from './webdav';
import {
  AuthFailSPError,
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';

/* eslint-disable @typescript-eslint/naming-convention */

interface WebDavRequestOptions {
  method: string;
  path: string;
  body?: string | null;
  headers?: Record<string, string>;
  ifNoneMatch?: string | null;
}

interface FileMeta {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: string;
  etag: string;
  data: Record<string, string>;
}

export class WebdavApi {
  private static readonly L = 'WebdavApi';

  constructor(private _getCfgOrError: () => Promise<WebdavPrivateCfg>) {}

  async upload({
    data,
    path,
    isOverwrite,
  }: {
    data: string;
    path: string;
    isOverwrite?: boolean;
  }): Promise<string | undefined> {
    try {
      const r = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers: { 'Content-Type': 'application/octet-stream' },
        ifNoneMatch: isOverwrite ? null : '*',
      });
      try {
        const responseHeaderObj: Record<string, string> = {};
        r.headers.forEach((value, key) => {
          responseHeaderObj[key.toLowerCase()] = value;
        });
        return this._findEtagInHeaders(responseHeaderObj);
      } catch (e) {
        pfLog(0, `${WebdavApi.L}.upload() direct etag parsing failed`, {
          path,
          error: e,
        });
        return undefined;
      }
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.upload() error`, { path, error: e });
      if (e?.status === 412) {
        throw new FileExistsAPIError();
      }
      throw e;
    }
  }

  async getFileMeta(path: string, localRev: string | null): Promise<FileMeta> {
    const response = await this._makeRequest({
      method: 'HEAD',
      path,
      ifNoneMatch: localRev,
    });

    // Create case-insensitive header object
    const responseHeaderObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaderObj[key.toLowerCase()] = value;
    });

    // Get etag from response headers
    const etag = this._findEtagInHeaders(responseHeaderObj);

    // Build the file stat object
    const fileMeta: FileMeta = {
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

    return fileMeta;
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<{ rev: string; dataStr: string }> {
    const response = await this._makeRequest({
      method: 'GET',
      path,
      ifNoneMatch: localRev,
    });

    const dataStr = await response.text();

    const headerObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerObj[key.toLowerCase()] = value;
    });

    const rev = this._findEtagInHeaders(headerObj);

    if (!rev) {
      throw new NoEtagAPIError(headerObj);
    }

    return {
      rev: this._cleanRev(rev),
      dataStr,
    };
  }

  async remove(path: string): Promise<void> {
    await this._makeRequest({
      method: 'DELETE',
      path,
    });
  }

  getRevFromMetaHelper(fileMeta: unknown | Headers): string {
    const d = (fileMeta as any)?.data || fileMeta;

    // Case-insensitive search for etag
    const etagKey = this._findEtagKeyInObject(d);
    if (etagKey && d[etagKey]) {
      return this._cleanRev(d[etagKey]);
    }

    pfLog(0, `${WebdavApi.L}.getRevFromMeta() No etag found in metadata`, {
      availableKeys: Object.keys(d),
      metadata: d,
    });
    throw new NoEtagAPIError(fileMeta);
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    try {
      await this._makeRequest({
        method: 'MKCOL',
        path: folderPath,
      });
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.createFolder() error`, { folderPath, error: e });
      // If MKCOL is not supported, try alternative approach with PUT
      if (e?.message?.includes('Method not allowed') || e?.status === 405) {
        pfLog(2, `${WebdavApi.L}.createFolder() MKCOL not supported, trying PUT`);
        try {
          await this._makeRequest({
            method: 'PUT',
            path: `${folderPath}/.folder`,
            body: '',
          });
        } catch (putError) {
          pfLog(0, `${WebdavApi.L}.createFolder() PUT fallback failed`, {
            folderPath,
            error: putError,
          });
          throw putError;
        }
      } else {
        throw e;
      }
    }
  }

  private async _makeRequest({
    method,
    path,
    body = null,
    headers = {},
    ifNoneMatch = null,
  }: WebDavRequestOptions): Promise<Response> {
    const cfg = await this._getCfgOrError();

    const requestHeaders = new Headers();
    requestHeaders.append('Authorization', this._getAuthHeader(cfg));
    if (ifNoneMatch) {
      requestHeaders.append('If-None-Match', ifNoneMatch);
    }
    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.append(key, value);
    });

    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method,
        headers: requestHeaders,
        body,
      });

      if (!response.ok) {
        pfLog(0, `${WebdavApi.L}._makeRequest() HTTP error`, {
          method,
          path,
          status: response.status,
          statusText: response.statusText,
        });
        throw new HttpNotOkAPIError(response);
      }
      return response;
    } catch (e) {
      pfLog(0, `${WebdavApi.L}._makeRequest() network error`, {
        method,
        path,
        error: e,
      });
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  private _findEtagInHeaders(headers: Record<string, string>): string {
    const etagKey = this._findEtagKeyInObject(headers);
    return etagKey ? this._cleanRev(headers[etagKey]) : '';
  }

  private _findEtagKeyInObject(obj: Record<string, any>): string | undefined {
    // Standard etag headers (case-insensitive search)
    const possibleEtagKeys = ['etag', 'oc-etag', 'oc:etag', 'getetag', 'x-oc-etag'];

    return Object.keys(obj).find((key) => possibleEtagKeys.includes(key.toLowerCase()));
  }

  private _cleanRev(rev: string): string {
    if (!rev) return '';

    const result = rev
      .replace(/\//g, '')
      .replace(/"/g, '')
      .replace(/&quot;/g, '')
      .trim();

    pfLog(3, `${WebdavApi.L}.cleanRev() "${rev}" -> "${result}"`);
    return result;
  }

  private _getUrl(path: string, cfg: WebdavPrivateCfg): string {
    // Ensure base URL ends with a trailing slash
    const baseUrl = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;

    // Remove leading slash from path if it exists
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    return new URL(normalizedPath, baseUrl).toString();
  }

  private _getAuthHeader(cfg: WebdavPrivateCfg): string {
    return `Basic ${btoa(`${cfg.userName}:${cfg.password}`)}`;
  }

  private _checkCommonErrors(e: any, targetPath: string): void {
    pfLog(0, `${WebdavApi.L} API error for ${targetPath}`, e);

    const status = e?.status || e?.response?.status;
    // Handle common HTTP error codes
    switch (status) {
      case 401:
      case 403:
        throw new AuthFailSPError(`WebDAV ${e.status}`, targetPath);
      case 404:
        throw new RemoteFileNotFoundAPIError(targetPath);
    }
  }
}
