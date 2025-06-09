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
    // Use PROPFIND to get file properties (WebDAV standard)
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
    <D:resourcetype/>
    <D:getcontenttype/>
  </D:prop>
</D:propfind>`;

    const response = await this._makeRequest({
      method: 'PROPFIND',
      path,
      body: propfindBody,
      headers: {
        'Content-Type': 'application/xml',
        Depth: '0',
      },
      ifNoneMatch: localRev,
    });

    const xmlText = await response.text();
    const fileMeta = this._parsePropsFromXml(xmlText, path);

    if (!fileMeta) {
      throw new RemoteFileNotFoundAPIError(path);
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

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileMeta(path, null);
      return true;
    } catch (e: any) {
      if (e?.status === 404) {
        return false;
      }
      throw e;
    }
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
    // First check if folder already exists
    const exists = await this.checkFolderExists(folderPath);
    if (exists) {
      return; // Folder already exists, nothing to do
    }

    try {
      await this._makeRequest({
        method: 'MKCOL',
        path: folderPath,
      });
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.createFolder() MKCOL error`, { folderPath, error: e });

      // Handle different error scenarios
      if (e?.status === 405) {
        // Method not allowed - MKCOL not supported
        pfLog(
          2,
          `${WebdavApi.L}.createFolder() MKCOL not supported, trying PUT fallback`,
        );
        try {
          await this._makeRequest({
            method: 'PUT',
            path: `${folderPath}/.folder`,
            body: '',
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        } catch (putError) {
          pfLog(0, `${WebdavApi.L}.createFolder() PUT fallback failed`, {
            folderPath,
            error: putError,
          });
          throw putError;
        }
      } else if (e?.status === 409) {
        // Conflict - parent directory doesn't exist, try to create it recursively
        const parentPath = folderPath.split('/').slice(0, -1).join('/');
        if (parentPath && parentPath !== folderPath) {
          await this.createFolder({ folderPath: parentPath });
          // Try again after creating parent
          await this._makeRequest({
            method: 'MKCOL',
            path: folderPath,
          });
        } else {
          throw e;
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

      // WebDAV specific status codes handling
      if (!response.ok && response.status !== 207) {
        // 207 Multi-Status is valid for WebDAV
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

  private _parsePropsFromXml(xmlText: string, requestPath: string): FileMeta | null {
    try {
      // Create a DOM parser to parse the XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        pfLog(
          0,
          `${WebdavApi.L}._parsePropsFromXml() XML parsing error`,
          parserError.textContent,
        );
        return null;
      }

      // Find the response element for our file
      const responses = xmlDoc.querySelectorAll('response');
      for (const response of Array.from(responses)) {
        const href = response.querySelector('href')?.textContent?.trim();
        if (!href) continue;

        // Match the href to our requested path (handle URL encoding and path variations)
        const decodedHref = decodeURIComponent(href);
        const normalizedHref = decodedHref.replace(/\/$/, ''); // Remove trailing slash
        const normalizedPath = requestPath.replace(/\/$/, '');

        if (
          normalizedHref.endsWith(normalizedPath) ||
          normalizedPath.endsWith(normalizedHref)
        ) {
          const propstat = response.querySelector('propstat');
          if (!propstat) continue;

          const status = propstat.querySelector('status')?.textContent;
          if (!status?.includes('200 OK')) continue;

          const prop = propstat.querySelector('prop');
          if (!prop) continue;

          // Extract properties
          const displayname = prop.querySelector('displayname')?.textContent || '';
          const contentLength =
            prop.querySelector('getcontentlength')?.textContent || '0';
          const lastModified = prop.querySelector('getlastmodified')?.textContent || '';
          const etag = prop.querySelector('getetag')?.textContent || '';
          const resourceType = prop.querySelector('resourcetype');
          const contentType = prop.querySelector('getcontenttype')?.textContent || '';

          // Determine if it's a collection (directory) or file
          const isCollection = resourceType?.querySelector('collection') !== null;

          return {
            filename: displayname || requestPath.split('/').pop() || '',
            basename: displayname || requestPath.split('/').pop() || '',
            lastmod: lastModified,
            size: parseInt(contentLength, 10),
            type: isCollection ? 'directory' : 'file',
            etag: this._cleanRev(etag),
            data: {
              'content-type': contentType,
              'content-length': contentLength,
              'last-modified': lastModified,
              etag: etag,
            },
          };
        }
      }

      pfLog(
        0,
        `${WebdavApi.L}._parsePropsFromXml() No matching response found for path: ${requestPath}`,
      );
      return null;
    } catch (error) {
      pfLog(0, `${WebdavApi.L}._parsePropsFromXml() parsing error`, error);
      return null;
    }
  }

  async checkFolderExists(folderPath: string): Promise<boolean> {
    try {
      const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`;

      const response = await this._makeRequest({
        method: 'PROPFIND',
        path: folderPath,
        body: propfindBody,
        headers: {
          'Content-Type': 'application/xml',
          Depth: '0',
        },
      });

      const xmlText = await response.text();
      const meta = this._parsePropsFromXml(xmlText, folderPath);
      return meta?.type === 'directory';
    } catch (e: any) {
      if (e?.status === 404) {
        return false;
      }
      throw e;
    }
  }

  async listFolder(folderPath: string): Promise<FileMeta[]> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:displayname/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
    <D:resourcetype/>
    <D:getcontenttype/>
  </D:prop>
</D:propfind>`;

    const response = await this._makeRequest({
      method: 'PROPFIND',
      path: folderPath,
      body: propfindBody,
      headers: {
        'Content-Type': 'application/xml',
        Depth: '1', // Get immediate children
      },
    });

    const xmlText = await response.text();
    return this._parseMultiplePropsFromXml(xmlText, folderPath);
  }

  private _parseMultiplePropsFromXml(xmlText: string, basePath: string): FileMeta[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        pfLog(
          0,
          `${WebdavApi.L}._parseMultiplePropsFromXml() XML parsing error`,
          parserError.textContent,
        );
        return [];
      }

      const results: FileMeta[] = [];
      const responses = xmlDoc.querySelectorAll('response');

      for (const response of Array.from(responses)) {
        const href = response.querySelector('href')?.textContent?.trim();
        if (!href) continue;

        const decodedHref = decodeURIComponent(href);

        // Skip the base path itself (we only want children)
        if (decodedHref.replace(/\/$/, '') === basePath.replace(/\/$/, '')) {
          continue;
        }

        const propstat = response.querySelector('propstat');
        if (!propstat) continue;

        const status = propstat.querySelector('status')?.textContent;
        if (!status?.includes('200 OK')) continue;

        const prop = propstat.querySelector('prop');
        if (!prop) continue;

        const displayname = prop.querySelector('displayname')?.textContent || '';
        const contentLength = prop.querySelector('getcontentlength')?.textContent || '0';
        const lastModified = prop.querySelector('getlastmodified')?.textContent || '';
        const etag = prop.querySelector('getetag')?.textContent || '';
        const resourceType = prop.querySelector('resourcetype');
        const contentType = prop.querySelector('getcontenttype')?.textContent || '';

        const isCollection = resourceType?.querySelector('collection') !== null;

        results.push({
          filename: displayname || decodedHref.split('/').pop() || '',
          basename: displayname || decodedHref.split('/').pop() || '',
          lastmod: lastModified,
          size: parseInt(contentLength, 10),
          type: isCollection ? 'directory' : 'file',
          etag: this._cleanRev(etag),
          data: {
            'content-type': contentType,
            'content-length': contentLength,
            'last-modified': lastModified,
            etag: etag,
            href: decodedHref,
          },
        });
      }

      return results;
    } catch (error) {
      pfLog(0, `${WebdavApi.L}._parseMultiplePropsFromXml() parsing error`, error);
      return [];
    }
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
      case 207:
        // Multi-Status is normal for WebDAV PROPFIND responses
        break;
    }
  }
}
