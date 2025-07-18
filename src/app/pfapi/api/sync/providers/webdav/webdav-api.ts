import { WebdavPrivateCfg } from './webdav.model';
import { Log, PFLog } from '../../../../../core/log';
import { FileMeta, WebdavXmlParser } from './webdav-xml-parser';
import { WebDavHttpAdapter, WebDavHttpResponse } from './webdav-http-adapter';
import {
  HttpNotOkAPIError,
  InvalidDataSPError,
  RemoteFileChangedUnexpectedly,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { WebDavHttpHeader, WebDavHttpMethod, WebDavHttpStatus } from './webdav.const';

/* eslint-disable @typescript-eslint/naming-convention */

export class WebdavApi {
  private static readonly L = 'WebdavApi';
  private xmlParser: WebdavXmlParser;
  private httpAdapter: WebDavHttpAdapter;
  private directoryCreationQueue = new Map<string, Promise<void>>();

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
        method: WebDavHttpMethod.PROPFIND,
        body: WebdavXmlParser.PROPFIND_XML,
        headers: {
          [WebDavHttpHeader.CONTENT_TYPE]: 'application/xml; charset=utf-8',
          [WebDavHttpHeader.DEPTH]: '0',
        },
      });

      if (response.status === WebDavHttpStatus.MULTI_STATUS) {
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
    localRev,
  }: {
    path: string;
    localRev?: string | null;
    // TODO remove
  }): Promise<{
    rev: string;
    dataStr: string;
    lastModified?: string;
    notModified?: boolean;
  }> {
    const cfg = await this._getCfgOrError();
    const fullPath = this._buildFullPath(cfg.baseUrl, path);

    try {
      const headers: Record<string, string> = {};

      // Add conditional headers if we have a local revision
      if (localRev) {
        if (this._isLikelyTimestamp(localRev)) {
          // Convert timestamp to HTTP date
          const date = new Date(parseInt(localRev));
          if (isNaN(date.getTime())) {
            PFLog.warn(
              `${WebdavApi.L}.download() Invalid timestamp for conditional request: ${localRev}`,
            );
          } else {
            headers[WebDavHttpHeader.IF_MODIFIED_SINCE] = date.toUTCString();
          }
        } else if (this._isLikelyDateString(localRev)) {
          // Validate and normalize the date string
          const parsedDate = new Date(localRev);
          if (isNaN(parsedDate.getTime())) {
            PFLog.warn(
              `${WebdavApi.L}.download() Invalid date string for conditional request: ${localRev}`,
            );
            // Fall back to treating it as an ETag
            headers[WebDavHttpHeader.IF_NONE_MATCH] = localRev;
          } else {
            // Use normalized UTC format
            headers[WebDavHttpHeader.IF_MODIFIED_SINCE] = parsedDate.toUTCString();
          }
        } else {
          // Assume it's an ETag
          headers[WebDavHttpHeader.IF_NONE_MATCH] = localRev;
        }
      }

      const response = await this._makeRequest({
        url: fullPath,
        method: WebDavHttpMethod.GET,
        headers,
      });

      // Handle 304 Not Modified
      if (response.status === WebDavHttpStatus.NOT_MODIFIED) {
        // File hasn't changed - return the current revision
        return {
          rev: localRev || '',
          dataStr: '',
          notModified: true,
        };
      }

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
        [WebDavHttpHeader.CONTENT_TYPE]: 'application/octet-stream',
      };

      // Set conditional headers based on revision type
      if (!isForceOverwrite && expectedRev) {
        if (this._isLikelyTimestamp(expectedRev)) {
          // Convert timestamp to HTTP date
          const date = new Date(parseInt(expectedRev));
          if (isNaN(date.getTime())) {
            PFLog.warn(
              `${WebdavApi.L}.upload() Invalid timestamp for conditional request: ${expectedRev}`,
            );
            // Skip conditional header - let server handle as unconditional
          } else {
            headers[WebDavHttpHeader.IF_UNMODIFIED_SINCE] = date.toUTCString();
            Log.verbose(WebdavApi.L, 'Using If-Unmodified-Since', date.toUTCString());
          }
        } else if (this._isLikelyDateString(expectedRev)) {
          // Validate and normalize the date string
          const parsedDate = new Date(expectedRev);
          if (isNaN(parsedDate.getTime())) {
            PFLog.warn(
              `${WebdavApi.L}.upload() Invalid date string for conditional request: ${expectedRev}`,
            );
            // Fall back to treating it as an ETag
            headers[WebDavHttpHeader.IF_MATCH] = expectedRev;
          } else {
            // Use normalized UTC format
            headers[WebDavHttpHeader.IF_UNMODIFIED_SINCE] = parsedDate.toUTCString();
            Log.verbose(
              WebdavApi.L,
              'Using If-Unmodified-Since',
              parsedDate.toUTCString(),
            );
          }
        } else {
          // Assume it's an ETag
          headers[WebDavHttpHeader.IF_MATCH] = expectedRev;
          Log.verbose(WebdavApi.L, 'Using If-Match', expectedRev);
        }
      }

      // Try to upload the file
      let response: WebDavHttpResponse;
      try {
        response = await this._makeRequest({
          url: fullPath,
          method: WebDavHttpMethod.PUT,
          body: data,
          headers,
        });
      } catch (uploadError) {
        // Check for 412 Precondition Failed - means file was modified
        if (
          uploadError instanceof HttpNotOkAPIError &&
          uploadError.response &&
          uploadError.response.status === WebDavHttpStatus.PRECONDITION_FAILED
        ) {
          throw new RemoteFileChangedUnexpectedly(
            `File ${path} was modified on remote (expected rev: ${expectedRev})`,
          );
        }

        if (
          // if we get a 404 on upload this also indicates that the directory does not exist (for nextcloud)
          uploadError instanceof RemoteFileNotFoundAPIError ||
          (uploadError instanceof HttpNotOkAPIError &&
            uploadError.response &&
            // If we get a 409 Conflict, it might be because parent directory doesn't exist
            uploadError.response.status === WebDavHttpStatus.CONFLICT)
        ) {
          PFLog.debug(
            `${WebdavApi.L}.upload() got 409, attempting to create parent directory`,
          );

          // Try to create parent directory
          await this._ensureParentDirectory(fullPath);

          // Retry the upload
          response = await this._makeRequest({
            url: fullPath,
            method: WebDavHttpMethod.PUT,
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

      let rev = etag ? this._cleanRev(etag) : lastModified || '';

      if (!rev) {
        // Some WebDAV servers don't return ETag/Last-Modified on PUT
        // Try to get it from a HEAD request first (cheaper than PROPFIND)
        PFLog.verbose(
          `${WebdavApi.L}.upload() no ETag/Last-Modified in PUT response, fetching via HEAD`,
        );
        try {
          const headResponse = await this._makeRequest({
            url: fullPath,
            method: WebDavHttpMethod.HEAD,
          });
          const headEtag = headResponse.headers['etag'] || headResponse.headers['ETag'];
          const headLastMod =
            headResponse.headers['last-modified'] ||
            headResponse.headers['Last-Modified'];
          rev = headEtag ? this._cleanRev(headEtag) : headLastMod || '';

          if (rev) {
            return { rev, lastModified: headLastMod };
          }
        } catch (headError) {
          PFLog.verbose(
            `${WebdavApi.L}.upload() HEAD request failed, falling back to PROPFIND`,
            headError,
          );
        }

        // If HEAD didn't work, fall back to PROPFIND
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
        headers[WebDavHttpHeader.IF_MATCH] = expectedEtag;
      }

      await this._makeRequest({
        url: fullPath,
        method: WebDavHttpMethod.DELETE,
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
      [WebDavHttpHeader.AUTHORIZATION]: `Basic ${auth}`,
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

    // Check if we're already creating this directory
    const existingPromise = this.directoryCreationQueue.get(parentPath);
    if (existingPromise) {
      PFLog.verbose(
        `${WebdavApi.L}._ensureParentDirectory() waiting for existing creation of ${parentPath}`,
      );
      await existingPromise;
      return;
    }

    // Create a new promise for this directory
    const creationPromise = this._createDirectory(parentPath);
    this.directoryCreationQueue.set(parentPath, creationPromise);

    try {
      await creationPromise;
    } finally {
      // Clean up the queue
      this.directoryCreationQueue.delete(parentPath);
    }
  }

  private async _createDirectory(path: string): Promise<void> {
    try {
      // Try to create directory
      await this._makeRequest({
        url: path,
        method: WebDavHttpMethod.MKCOL,
      });
      PFLog.verbose(`${WebdavApi.L}._createDirectory() created ${path}`);
    } catch (e) {
      // Check if error is due to directory already existing (405 Method Not Allowed or 409 Conflict)
      if (
        e instanceof HttpNotOkAPIError &&
        e.response &&
        (e.response.status === WebDavHttpStatus.METHOD_NOT_ALLOWED || // Method not allowed - directory exists
          e.response.status === WebDavHttpStatus.CONFLICT || // Conflict - parent doesn't exist
          e.response.status === WebDavHttpStatus.MOVED_PERMANENTLY || // Moved permanently - directory exists
          e.response.status === WebDavHttpStatus.OK) // OK - directory exists
      ) {
        PFLog.verbose(
          `${WebdavApi.L}._createDirectory() directory likely exists: ${path} (status: ${e.response.status})`,
        );
      } else {
        // Log other errors but don't throw - we'll let the actual upload fail if needed
        PFLog.warn(`${WebdavApi.L}._createDirectory() unexpected error for ${path}`, e);
      }
    }
  }

  private _buildFullPath(baseUrl: string, path: string): string {
    // Validate path to prevent directory traversal attacks
    if (path.includes('..') || path.includes('//')) {
      throw new Error(
        `Invalid path: ${path}. Path cannot contain '..' or '//' sequences`,
      );
    }

    // Ensure baseUrl doesn't end with / and path starts with /
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Additional validation: ensure the path doesn't try to escape the base path
    const normalizedPath = cleanPath.replace(/\/+/g, '/'); // Replace multiple slashes with single slash

    return `${cleanBase}${normalizedPath}`;
  }

  private _cleanRev(rev: string): string {
    if (!rev) return '';
    const result = rev
      .replace(/\//g, '')
      .replace(/"/g, '')
      .replace(/&quot;/g, '')
      .trim();
    PFLog.verbose(`${WebdavApi.L}.cleanRev() "${rev}" -> "${result}"`);

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
      method: WebDavHttpMethod.HEAD,
    });

    // Safely access headers with null checks
    const headers = response.headers || {};
    const etag = headers['etag'] || headers['ETag'] || '';
    const lastModified = headers['last-modified'] || headers['Last-Modified'] || '';
    const contentLength = headers['content-length'] || headers['Content-Length'] || '0';
    const contentType = headers['content-type'] || headers['Content-Type'] || '';

    if (!lastModified) {
      throw new InvalidDataSPError('No Last-Modified header in HEAD response');
    }

    // Extract filename from path
    const filename = fullPath.split('/').pop() || '';

    // Safely parse content length with validation
    let size = 0;
    try {
      const parsedSize = parseInt(contentLength, 10);
      if (!isNaN(parsedSize) && parsedSize >= 0) {
        size = parsedSize;
      }
    } catch (e) {
      PFLog.warn(
        `${WebdavApi.L}._getFileMetaViaHead() invalid content-length: ${contentLength}`,
      );
    }

    return {
      filename,
      basename: filename,
      lastmod: lastModified,
      size,
      type: contentType || 'application/octet-stream',
      etag: etag ? this._cleanRev(etag) : '',
      data: {},
    };
  }
}
