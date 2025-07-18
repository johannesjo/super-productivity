import { WebdavPrivateCfg } from './webdav.model';
import { Log, PFLog } from '../../../../../core/log';
import { FileMeta, WebdavXmlParser } from './webdav-xml-parser';
import { WebDavHttpAdapter, WebDavHttpResponse } from './webdav-http-adapter';
import {
  HttpNotOkAPIError,
  InvalidDataSPError,
  RemoteFileNotFoundAPIError,
  RemoteFileChangedUnexpectedly,
} from '../../../errors/errors';

/* eslint-disable @typescript-eslint/naming-convention */

export class WebdavApi {
  private static readonly L = 'WebdavApi';
  private xmlParser: WebdavXmlParser;
  private httpAdapter: WebDavHttpAdapter;

  constructor(private _getCfgOrError: () => Promise<WebdavPrivateCfg>) {
    this.xmlParser = new WebdavXmlParser((rev: string) => this._cleanRev(rev));
    this.httpAdapter = new WebDavHttpAdapter();
  }

  async getFileMeta(
    path: string,
    _localRev: string | null,
    useGetFallback: boolean = false,
  ): Promise<FileMeta> {
    const cfg = await this._getCfgOrError();
    const fullPath = this._buildFullPath(cfg.baseUrl, path);

    try {
      // Try PROPFIND first
      const response = await this._makeRequest({
        url: fullPath,
        method: 'PROPFIND',
        body: WebdavXmlParser.PROPFIND_XML,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '0',
        },
      });

      if (response.status === 207) {
        const files = this.xmlParser.parseMultiplePropsFromXml(response.data, path);
        if (files && files.length > 0) {
          const meta = files[0];
          PFLog.verbose(`${WebdavApi.L}.getFileMeta() PROPFIND success for ${path}`, {
            etag: meta.etag,
            lastmod: meta.lastmod,
          });
          return meta;
        }
      }

      // If PROPFIND fails or returns no data, try HEAD request as fallback
      if (useGetFallback) {
        return await this._getFileMetaViaHead(fullPath);
      }

      throw new RemoteFileNotFoundAPIError(path);
    } catch (e) {
      PFLog.error(`${WebdavApi.L}.getFileMeta() error`, { path, error: e });
      throw e;
    }
  }

  async download({
    path,
    localRev: _localRev,
    rangeStart,
    rangeEnd,
  }: {
    path: string;
    localRev?: string | null;
    rangeStart?: number;
    rangeEnd?: number;
  }): Promise<{ rev: string; dataStr: string; lastModified?: string }> {
    const cfg = await this._getCfgOrError();
    const fullPath = this._buildFullPath(cfg.baseUrl, path);

    try {
      const headers: Record<string, string> = {};

      if (rangeStart !== undefined && rangeEnd !== undefined) {
        headers['Range'] = `bytes=${rangeStart}-${rangeEnd}`;
      }

      const response = await this._makeRequest({
        url: fullPath,
        method: 'GET',
        headers,
      });

      // Validate it's not an HTML error page
      this.xmlParser.validateResponseContent(
        response.data,
        path,
        'download',
        'file content',
      );

      // Get revision from ETag or Last-Modified
      const etag = response.headers['etag'] || response.headers['ETag'];
      const lastModified =
        response.headers['last-modified'] || response.headers['Last-Modified'];

      const rev = etag ? this._cleanRev(etag) : lastModified || '';

      if (!rev) {
        PFLog.warn(
          `${WebdavApi.L}.download() no ETag or Last-Modified found for ${path}`,
        );
      }

      return {
        rev,
        dataStr: response.data,
        lastModified,
      };
    } catch (e) {
      PFLog.error(`${WebdavApi.L}.download() error`, { path, error: e });
      throw e;
    }
  }

  async upload({
    path,
    data,
    expectedRev,
    isForceOverwrite = false,
  }: {
    path: string;
    data: string;
    expectedRev?: string | null;
    isForceOverwrite?: boolean;
  }): Promise<{ rev: string; lastModified?: string }> {
    const cfg = await this._getCfgOrError();
    const fullPath = this._buildFullPath(cfg.baseUrl, path);

    try {
      // Prepare headers for upload
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
      };

      // Set conditional headers based on revision type
      if (!isForceOverwrite && expectedRev) {
        if (this._isLikelyTimestamp(expectedRev)) {
          // Convert timestamp to HTTP date
          const date = new Date(parseInt(expectedRev));
          Log.verbose(WebdavApi.L, 'isLikelyTimestamp()', expectedRev, date);
          headers['If-Unmodified-Since'] = date.toUTCString();
        } else if (this._isLikelyDateString(expectedRev)) {
          // It's already a date string, use as-is
          Log.verbose(WebdavApi.L, '_isLikelyDateString()', expectedRev);
          headers['If-Unmodified-Since'] = expectedRev;
        } else {
          // Assume it's an ETag
          headers['If-Match'] = expectedRev;
        }
      }

      // Try to upload the file
      let response: WebDavHttpResponse;
      try {
        response = await this._makeRequest({
          url: fullPath,
          method: 'PUT',
          body: data,
          headers,
        });
      } catch (uploadError) {
        // Check for 412 Precondition Failed - means file was modified
        if (
          uploadError instanceof HttpNotOkAPIError &&
          uploadError.response &&
          uploadError.response.status === 412
        ) {
          throw new RemoteFileChangedUnexpectedly(
            `File ${path} was modified on remote (expected rev: ${expectedRev})`,
          );
        }

        // If we get a 409 Conflict, it might be because parent directory doesn't exist
        if (
          uploadError instanceof HttpNotOkAPIError &&
          uploadError.response &&
          uploadError.response.status === 409
        ) {
          PFLog.debug(
            `${WebdavApi.L}.upload() got 409, attempting to create parent directory`,
          );

          // Try to create parent directory
          await this._ensureParentDirectory(fullPath);

          // Retry the upload
          response = await this._makeRequest({
            url: fullPath,
            method: 'PUT',
            body: data,
            headers,
          });
        } else {
          throw uploadError;
        }
      }

      // Get the new revision
      const etag = response.headers['etag'] || response.headers['ETag'];
      const lastModified =
        response.headers['last-modified'] || response.headers['Last-Modified'];

      const rev = etag ? this._cleanRev(etag) : lastModified || '';

      if (!rev) {
        // If no ETag/Last-Modified in response, fetch metadata
        const meta = await this.getFileMeta(path, null, true);
        return {
          rev: meta.etag || meta.lastmod,
          lastModified: meta.lastmod,
        };
      }

      return { rev, lastModified };
    } catch (e) {
      PFLog.error(`${WebdavApi.L}.upload() error`, { path, error: e });
      throw e;
    }
  }

  async remove(path: string, expectedEtag?: string): Promise<void> {
    const cfg = await this._getCfgOrError();
    const fullPath = this._buildFullPath(cfg.baseUrl, path);

    try {
      const headers: Record<string, string> = {};

      if (expectedEtag) {
        headers['If-Match'] = expectedEtag;
      }

      await this._makeRequest({
        url: fullPath,
        method: 'DELETE',
        headers,
      });

      PFLog.verbose(`${WebdavApi.L}.remove() success for ${path}`);
    } catch (e) {
      PFLog.error(`${WebdavApi.L}.remove() error`, { path, error: e });
      throw e;
    }
  }

  private async _makeRequest({
    url,
    method,
    body = null,
    headers = {},
  }: {
    url: string;
    method: string;
    body?: string | null;
    headers?: Record<string, string>;
  }): Promise<WebDavHttpResponse> {
    const cfg = await this._getCfgOrError();

    // Build authorization header
    const auth = btoa(`${cfg.userName}:${cfg.password}`);
    const allHeaders = {
      Authorization: `Basic ${auth}`,
      ...headers,
    };

    return await this.httpAdapter.request({
      url,
      method,
      headers: allHeaders,
      body,
    });
  }

  private async _ensureParentDirectory(fullPath: string): Promise<void> {
    const pathParts = fullPath.split('/');
    pathParts.pop(); // Remove filename
    const parentPath = pathParts.join('/');

    if (!parentPath || parentPath === fullPath) {
      return;
    }

    try {
      // Try to create parent directory
      await this._makeRequest({
        url: parentPath,
        method: 'MKCOL',
      });
      PFLog.verbose(`${WebdavApi.L}._ensureParentDirectory() created ${parentPath}`);
    } catch (e) {
      // Ignore errors - directory might already exist
      // Most errors mean directory already exists or we don't have permissions
      PFLog.verbose(
        `${WebdavApi.L}._ensureParentDirectory() directory creation attempt for ${parentPath}`,
        e,
      );
    }
  }

  private _buildFullPath(baseUrl: string, path: string): string {
    // Ensure baseUrl doesn't end with / and path starts with /
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  private _cleanRev(rev: string): string {
    if (!rev) return '';
    const result = rev
      .replace(/\//g, '')
      .replace(/"/g, '')
      .replace(/&quot;/g, '')
      .trim();
    PFLog.verbose(`${WebdavApi.L}.cleanRev() "${rev}" -> "${result}"`);
    console.log('REV', result);

    return result;
  }

  private _isLikelyTimestamp(val: string): boolean {
    return /^\d{10,13}$/.test(val); // Unix timestamp (seconds or milliseconds)
  }

  private _isLikelyDateString(val: string): boolean {
    // Check for common date patterns
    return (
      val.includes('GMT') ||
      val.includes('Z') ||
      val.includes('T') ||
      /\d{4}-\d{2}-\d{2}/.test(val) || // ISO date
      /\w{3},\s\d{1,2}\s\w{3}\s\d{4}/.test(val) // RFC format
    );
  }

  private async _getFileMetaViaHead(fullPath: string): Promise<FileMeta> {
    const response = await this._makeRequest({
      url: fullPath,
      method: 'HEAD',
    });

    const etag = response.headers['etag'] || response.headers['ETag'];
    const lastModified =
      response.headers['last-modified'] || response.headers['Last-Modified'];
    const contentLength =
      response.headers['content-length'] || response.headers['Content-Length'];
    const contentType =
      response.headers['content-type'] || response.headers['Content-Type'];

    if (!lastModified) {
      throw new InvalidDataSPError('No Last-Modified header in HEAD response');
    }

    // Extract filename from path
    const filename = fullPath.split('/').pop() || '';

    return {
      filename,
      basename: filename,
      lastmod: lastModified,
      size: parseInt(contentLength || '0', 10),
      type: contentType || 'application/octet-stream',
      etag: etag ? this._cleanRev(etag) : '',
      data: {},
    };
  }
}
