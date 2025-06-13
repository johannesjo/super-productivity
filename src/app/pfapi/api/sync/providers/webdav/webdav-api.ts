import { WebdavPrivateCfg } from './webdav';
import {
  AuthFailSPError,
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { pfLog } from '../../../util/log';
import { IS_ANDROID_WEB_VIEW } from '../../../../../util/is-android-web-view';
import { CapacitorHttp } from '@capacitor/core';

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
  private static readonly PROPFIND_XML = `<?xml version="1.0" encoding="utf-8" ?>
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

  constructor(private _getCfgOrError: () => Promise<WebdavPrivateCfg>) {}

  private _shouldUseCapacitorHttp(method: string): boolean {
    if (!IS_ANDROID_WEB_VIEW) return false;

    const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    const shouldUse = !standardMethods.includes(method.toUpperCase());

    pfLog(1, `${WebdavApi.L}._shouldUseCapacitorHttp() method check`, {
      method,
      isAndroidWebView: IS_ANDROID_WEB_VIEW,
      isStandard: !shouldUse,
      shouldUseCapacitor: shouldUse,
    });

    return shouldUse;
  }

  private async _makeCapacitorHttpRequest({
    method,
    path,
    body = null,
    headers = {},
    ifNoneMatch = null,
    cfg,
  }: WebDavRequestOptions & { cfg: any }): Promise<Response> {
    const requestHeaders: Record<string, string> = {
      Authorization: this._getAuthHeader(cfg),
      ...headers,
    };

    if (ifNoneMatch) {
      requestHeaders['If-None-Match'] = ifNoneMatch;
    }

    const url = this._getUrl(path, cfg);

    pfLog(2, `${WebdavApi.L}._makeCapacitorHttpRequest() using CapacitorHttp`, {
      method,
      url,
      headers: Object.keys(requestHeaders),
    });

    try {
      const capacitorResponse = await CapacitorHttp.request({
        url,
        method,
        headers: requestHeaders,
        data: body,
      });

      // Convert Capacitor response to standard Response object
      const response = new Response(capacitorResponse.data, {
        status: capacitorResponse.status,
        statusText: capacitorResponse.status.toString(),
        headers: new Headers(capacitorResponse.headers || {}),
      });

      this._validateWebDavResponse(response, method, path);

      return response;
    } catch (e) {
      pfLog(0, `${WebdavApi.L}._makeCapacitorHttpRequest() error`, {
        method,
        path,
        error: e,
      });
      this._checkCommonErrors(e, path);
      throw e;
    }
  }

  // Utility methods to reduce duplication
  private _responseHeadersToObject(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }

  private _createConditionalHeaders(
    isOverwrite?: boolean,
    expectedEtag?: string | null,
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!isOverwrite) {
      if (expectedEtag) {
        headers['If-Match'] = expectedEtag;
      } else {
        headers['If-None-Match'] = '*';
      }
    } else if (expectedEtag) {
      headers['If-Match'] = expectedEtag;
    }
    return headers;
  }

  private _isHtmlResponse(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    return (
      trimmed.startsWith('<!doctype html') ||
      trimmed.startsWith('<html') ||
      text.includes('There is nothing here, sorry')
    );
  }

  async upload({
    data,
    path,
    isOverwrite,
    expectedEtag,
  }: {
    data: string;
    path: string;
    isOverwrite?: boolean;
    expectedEtag?: string | null;
  }): Promise<string | undefined> {
    pfLog(1, `${WebdavApi.L}.upload() starting upload`, {
      path,
      dataLength: data.length,
      isOverwrite,
      expectedEtag,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Length': new Blob([data]).size.toString(),
      ...this._createConditionalHeaders(isOverwrite, expectedEtag),
    };

    pfLog(1, `${WebdavApi.L}.upload() about to make PUT request`, {
      path,
      headers: Object.keys(headers),
    });

    try {
      // Ensure parent directory exists before upload
      const response = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers,
      });

      pfLog(1, `${WebdavApi.L}.upload() PUT request completed`, {
        path,
        status: response.status,
      });

      // Extract etag from response headers
      const responseHeaderObj = this._responseHeadersToObject(response);
      const etag = this._findEtagInHeaders(responseHeaderObj);

      if (!etag) {
        pfLog(1, `${WebdavApi.L}.upload() no etag in response headers`, {
          path,
          headers: responseHeaderObj,
        });
        // Try to get etag by doing a PROPFIND immediately after upload
        try {
          const meta = await this.getFileMeta(path, null);
          return meta.etag;
        } catch (metaError) {
          pfLog(0, `${WebdavApi.L}.upload() failed to get etag via PROPFIND`, metaError);
        }
      }

      return etag;
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.upload() error`, { path, error: e });

      // Enhanced error handling for WebDAV-specific scenarios
      if (
        e?.status === 409 ||
        (e instanceof HttpNotOkAPIError && e.response?.status === 409)
      ) {
        return this._handleUploadConflict(path, data, headers);
      }

      this._handleUploadError(e, path, expectedEtag);
    }
  }

  async getFileMeta(path: string, localRev: string | null): Promise<FileMeta> {
    try {
      const response = await this._makeRequest({
        method: 'PROPFIND',
        path,
        body: WebdavApi.PROPFIND_XML,
        headers: {
          'Content-Type': 'application/xml',
          Depth: '0',
        },
        ifNoneMatch: localRev,
      });

      const xmlText = await response.text();

      // Check if response is HTML instead of XML
      if (this._isHtmlResponse(xmlText)) {
        pfLog(1, `${WebdavApi.L}.getFileMeta() received HTML response instead of XML`, {
          path,
          responseSnippet: xmlText.substring(0, 200),
        });
        throw new RemoteFileNotFoundAPIError(path);
      }

      const fileMeta = this._parsePropsFromXml(xmlText, path);

      if (!fileMeta) {
        throw new RemoteFileNotFoundAPIError(path);
      }

      return fileMeta;
    } catch (e: any) {
      if (e?.status === 404) {
        throw new RemoteFileNotFoundAPIError(path);
      }

      // If PROPFIND fails (especially on Android), try HEAD as fallback
      pfLog(1, `${WebdavApi.L}.getFileMeta() PROPFIND failed, trying HEAD fallback`, e);

      if (IS_ANDROID_WEB_VIEW || e?.message?.includes('PROPFIND')) {
        return this._getFileMetaWithHead(path, localRev);
      }

      throw e;
    }
  }

  /**
   * Get file metadata using HEAD request (fallback for Android WebView)
   */
  private async _getFileMetaWithHead(
    path: string,
    localRev: string | null,
  ): Promise<FileMeta> {
    try {
      const headers: Record<string, string> = {};
      if (localRev) {
        headers['If-None-Match'] = localRev;
      }

      const response = await this._makeRequest({
        method: 'HEAD',
        path,
        headers,
      });

      const responseHeaders = this._responseHeadersToObject(response);
      const etag = this._findEtagInHeaders(responseHeaders);

      if (!etag) {
        pfLog(1, `${WebdavApi.L}._getFileMetaWithHead() no etag in response headers`, {
          path,
          headers: responseHeaders,
        });
        // Generate a basic etag using content length and last modified if available
        const contentLength = responseHeaders['content-length'] || '0';
        const lastModified = responseHeaders['last-modified'] || Date.now().toString();
        const basicEtag = `${contentLength}-${lastModified}`.replace(/[^a-zA-Z0-9]/g, '');

        pfLog(1, `${WebdavApi.L}._getFileMetaWithHead() generated basic etag`, {
          path,
          basicEtag,
          contentLength,
          lastModified,
        });
      }

      // Extract filename from path
      const filename = path.split('/').pop() || '';

      return {
        filename,
        basename: filename,
        lastmod: responseHeaders['last-modified'] || '',
        size: parseInt(responseHeaders['content-length'] || '0', 10),
        type: 'file', // HEAD doesn't distinguish directories
        etag: etag || `${responseHeaders['content-length'] || '0'}-${Date.now()}`,
        data: {
          'content-type': responseHeaders['content-type'] || '',
          'content-length': responseHeaders['content-length'] || '0',
          'last-modified': responseHeaders['last-modified'] || '',
          etag: etag || '',
          href: path,
        },
      };
    } catch (e: any) {
      if (e?.status === 404) {
        throw new RemoteFileNotFoundAPIError(path);
      }
      throw e;
    }
  }

  async download({
    path,
    localRev,
    rangeStart,
    rangeEnd,
  }: {
    path: string;
    localRev?: string | null;
    rangeStart?: number;
    rangeEnd?: number;
  }): Promise<{ rev: string; dataStr: string }> {
    pfLog(1, `${WebdavApi.L}.download() starting`, {
      path,
      localRev,
      hasLocalRev: !!localRev,
    });

    try {
      const headers: Record<string, string> = {};

      // Only use conditional headers if we have a local revision to compare against
      // This prevents 304 responses during full downloads when localRev is null
      if (localRev) {
        // Use If-None-Match to avoid downloading if file hasn't changed
        headers['If-None-Match'] = localRev;
        pfLog(1, `${WebdavApi.L}.download() using conditional headers`, {
          path,
          localRev,
        });
      } else {
        pfLog(1, `${WebdavApi.L}.download() no conditional headers (fresh download)`, {
          path,
        });
      }

      // Add Range header for partial content requests (useful for large files)
      if (rangeStart !== undefined) {
        const rangeHeader =
          rangeEnd !== undefined
            ? `bytes=${rangeStart}-${rangeEnd}`
            : `bytes=${rangeStart}-`;
        headers['Range'] = rangeHeader;
      }

      // Add Accept-Encoding for compression if supported
      headers['Accept-Encoding'] = 'gzip, deflate';

      // Specify expected content type
      headers['Accept'] = 'application/octet-stream, text/plain, */*';

      const response = await this._makeRequest({
        method: 'GET',
        path,
        headers,
      });

      // Handle different response statuses
      if (response.status === 304) {
        // Not Modified - file hasn't changed
        pfLog(1, `${WebdavApi.L}.download() 304 Not Modified - file unchanged`, {
          path,
          localRev,
        });

        const notModifiedError = new Error(`File not modified: ${path}`);
        (notModifiedError as any).status = 304;
        (notModifiedError as any).localRev = localRev;
        throw notModifiedError;
      }

      if (response.status === 206) {
        // Partial Content - range request successful
        pfLog(2, `${WebdavApi.L}.download() received partial content for ${path}`);
      }

      // Get response data
      const dataStr = await response.text();

      // Check if response is HTML instead of file content
      if (this._isHtmlResponse(dataStr)) {
        pfLog(
          1,
          `${WebdavApi.L}.download() received HTML error page instead of file content`,
          {
            path,
            responseSnippet: dataStr.substring(0, 200),
          },
        );
        throw new RemoteFileNotFoundAPIError(path);
      }

      // Validate response content
      if (!dataStr && response.status === 200) {
        pfLog(1, `${WebdavApi.L}.download() received empty content for ${path}`);
        // Empty file is valid in some cases, but log it
      }

      // Extract headers
      const headerObj = this._responseHeadersToObject(response);

      // Get etag/revision
      const rev = this._findEtagInHeaders(headerObj);

      if (!rev) {
        pfLog(1, `${WebdavApi.L}.download() no etag in response headers`, {
          path,
          headers: headerObj,
        });
        // Try to get etag via PROPFIND as fallback
        try {
          const meta = await this.getFileMeta(path, null);
          return {
            rev: meta.etag,
            dataStr,
          };
        } catch (metaError) {
          // If PROPFIND also fails, don't try to generate hash for non-existent files
          if (metaError instanceof RemoteFileNotFoundAPIError) {
            throw metaError;
          }
          pfLog(0, `${WebdavApi.L}.download() PROPFIND fallback failed`, metaError);
          // Use content-based hash as last resort
          const crypto = globalThis.crypto || (globalThis as any).msCrypto;
          if (crypto && crypto.subtle) {
            try {
              const encoder = new TextEncoder();
              const data = encoder.encode(dataStr);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
              return {
                rev: hashHex.substring(0, 16), // Use first 16 chars as etag
                dataStr,
              };
            } catch (hashError) {
              pfLog(0, `${WebdavApi.L}.download() hash generation failed`, hashError);
            }
          }
          throw new NoEtagAPIError(headerObj);
        }
      }

      return {
        rev: this._cleanRev(rev),
        dataStr,
      };
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.download() error`, { path, error: e });
      this._handleDownloadError(e, path);
    }
  }

  async remove(path: string, expectedEtag?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {};

      // Add conditional headers for safe deletion
      if (expectedEtag) {
        // Use If-Match to ensure we're deleting the expected version
        headers['If-Match'] = expectedEtag;
      }

      // Check if resource exists before deletion (optional safety check)
      let resourceType: string | undefined;
      try {
        const meta = await this.getFileMeta(path, null);
        resourceType = meta.type;
      } catch (checkError: any) {
        if (checkError?.status === 404) {
          // Resource doesn't exist, consider deletion successful
          pfLog(2, `${WebdavApi.L}.remove() resource already doesn't exist: ${path}`);
          return;
        }
        // If we can't check, proceed with deletion anyway
        pfLog(
          1,
          `${WebdavApi.L}.remove() couldn't check resource before deletion`,
          checkError,
        );
      }

      // Add Depth header for collections (directories)
      if (resourceType === 'directory') {
        headers['Depth'] = 'infinity'; // Delete directory and all contents
        pfLog(
          2,
          `${WebdavApi.L}.remove() deleting directory with infinity depth: ${path}`,
        );
      }

      const response = await this._makeRequest({
        method: 'DELETE',
        path,
        headers,
      });

      // Check for multi-status response (207) which might contain partial failures
      if (response.status === 207) {
        const xmlText = await response.text();
        const hasErrors = await this._checkDeleteMultiStatusResponse(xmlText, path);
        if (hasErrors) {
          throw new Error(`Partial deletion failure for: ${path}`);
        }
      }

      pfLog(2, `${WebdavApi.L}.remove() successfully deleted: ${path}`);
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.remove() error`, { path, error: e });
      this._handleRemoveError(e, path, expectedEtag);
    }
  }

  private async _checkDeleteMultiStatusResponse(
    xmlText: string,
    requestPath: string,
  ): Promise<boolean> {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const responses = xmlDoc.querySelectorAll('response');
      let hasErrors = false;

      for (const response of Array.from(responses)) {
        const href = response.querySelector('href')?.textContent?.trim();
        const status = response.querySelector('status')?.textContent;

        if (href && status && !status.includes('200') && !status.includes('204')) {
          pfLog(
            0,
            `${WebdavApi.L}._checkDeleteMultiStatusResponse() deletion failed for`,
            {
              href,
              status,
              requestPath,
            },
          );
          hasErrors = true;
        }
      }

      return hasErrors;
    } catch (parseError) {
      pfLog(
        0,
        `${WebdavApi.L}._checkDeleteMultiStatusResponse() XML parsing error`,
        parseError,
      );
      return false; // Assume success if we can't parse the response
    }
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
    try {
      await this._makeRequest({
        method: 'MKCOL',
        path: folderPath,
      });
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.createFolder() MKCOL error`, { folderPath, error: e });

      // Handle different error scenarios
      if (e?.status === 405 || (IS_ANDROID_WEB_VIEW && e?.message?.includes('MKCOL'))) {
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
      } else if (e?.status === 403) {
        // Forbidden - might be a permissions issue or the directory already exists
        pfLog(
          0,
          `${WebdavApi.L}.createFolder() 403 Forbidden - check WebDAV permissions and path`,
          {
            folderPath,
            baseUrl: (await this._getCfgOrError()).baseUrl,
            error: e,
          },
        );
        throw e;
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

    pfLog(1, `${WebdavApi.L}._makeRequest() starting`, {
      method,
      path: path.substring(0, 50),
    });

    // Check if we should use Capacitor HTTP for this request
    const shouldUseCapacitor = this._shouldUseCapacitorHttp(method);
    pfLog(1, `${WebdavApi.L}._makeRequest() routing decision`, {
      method,
      shouldUseCapacitor,
    });

    if (shouldUseCapacitor) {
      pfLog(1, `${WebdavApi.L}._makeRequest() using Capacitor HTTP`);
      return this._makeCapacitorHttpRequest({
        method,
        path,
        body,
        headers,
        ifNoneMatch,
        cfg,
      });
    }

    pfLog(1, `${WebdavApi.L}._makeRequest() using regular fetch`);

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

      this._validateWebDavResponse(response, method, path);
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
    const baseUrl = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return new URL(normalizedPath, baseUrl).toString();
  }

  private _getAuthHeader(cfg: WebdavPrivateCfg): string {
    return `Basic ${btoa(`${cfg.userName}:${cfg.password}`)}`;
  }

  private _parseXmlResponseElement(
    response: Element,
    requestPath: string,
  ): FileMeta | null {
    const href = response.querySelector('href')?.textContent?.trim();
    if (!href) return null;

    // Decode the href for processing
    const decodedHref = decodeURIComponent(href);

    const propstat = response.querySelector('propstat');
    if (!propstat) return null;

    const status = propstat.querySelector('status')?.textContent;
    if (!status?.includes('200 OK')) return null;

    const prop = propstat.querySelector('prop');
    if (!prop) return null;

    // Extract properties
    const displayname = prop.querySelector('displayname')?.textContent || '';
    const contentLength = prop.querySelector('getcontentlength')?.textContent || '0';
    const lastModified = prop.querySelector('getlastmodified')?.textContent || '';
    const etag = prop.querySelector('getetag')?.textContent || '';
    const resourceType = prop.querySelector('resourcetype');
    const contentType = prop.querySelector('getcontenttype')?.textContent || '';

    // Determine if it's a collection (directory) or file
    const isCollection = resourceType?.querySelector('collection') !== null;

    return {
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
    };
  }

  private _parsePropsFromXml(xmlText: string, requestPath: string): FileMeta | null {
    try {
      // Check if xmlText is empty or not valid XML
      if (!xmlText || xmlText.trim() === '') {
        pfLog(0, `${WebdavApi.L}._parsePropsFromXml() Empty XML response`);
        return null;
      }

      // Check if response is HTML instead of XML
      if (this._isHtmlResponse(xmlText)) {
        pfLog(0, `${WebdavApi.L}._parsePropsFromXml() Received HTML instead of XML`, {
          requestPath,
          responseSnippet: xmlText.substring(0, 200),
        });
        return null;
      }

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

        const decodedHref = decodeURIComponent(href);
        const normalizedHref = decodedHref.replace(/\/$/, '');
        const normalizedPath = requestPath.replace(/\/$/, '');

        if (
          normalizedHref.endsWith(normalizedPath) ||
          normalizedPath.endsWith(normalizedHref)
        ) {
          return this._parseXmlResponseElement(response, requestPath);
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
      const response = await this._makeRequest({
        method: 'PROPFIND',
        path: folderPath,
        body: WebdavApi.PROPFIND_XML,
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

      // If PROPFIND fails (especially on Android), try HEAD fallback
      if (IS_ANDROID_WEB_VIEW || e?.message?.includes('PROPFIND')) {
        try {
          await this._makeRequest({
            method: 'HEAD',
            path: folderPath,
          });
          // If HEAD succeeds, assume it's a folder (we can't easily distinguish on Android)
          return true;
        } catch (headError: any) {
          if (headError?.status === 404) {
            return false;
          }
          throw headError;
        }
      }

      throw e;
    }
  }

  async listFolder(folderPath: string): Promise<FileMeta[]> {
    try {
      const response = await this._makeRequest({
        method: 'PROPFIND',
        path: folderPath,
        body: WebdavApi.PROPFIND_XML,
        headers: {
          'Content-Type': 'application/xml',
          Depth: '1', // Get immediate children
        },
      });

      const xmlText = await response.text();
      return this._parseMultiplePropsFromXml(xmlText, folderPath);
    } catch (e: any) {
      pfLog(0, `${WebdavApi.L}.listFolder() PROPFIND failed`, e);

      // On Android WebView or if PROPFIND fails, return empty array
      if (IS_ANDROID_WEB_VIEW || e?.message?.includes('PROPFIND')) {
        pfLog(
          1,
          `${WebdavApi.L}.listFolder() fallback - returning empty list for Android or PROPFIND error`,
        );
        return [];
      }

      throw e;
    }
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
        // Need to handle both absolute paths and relative paths
        const normalizedHref = decodedHref.replace(/\/$/, '');
        const normalizedBasePath = basePath.replace(/\/$/, '');

        // Check if it's the folder itself by comparing the end of the path
        if (
          normalizedHref === normalizedBasePath ||
          normalizedHref.endsWith('/' + normalizedBasePath) ||
          normalizedHref === '/' + normalizedBasePath
        ) {
          continue;
        }

        const fileMeta = this._parseXmlResponseElement(response, decodedHref);
        if (fileMeta) {
          results.push(fileMeta);
        }
      }

      return results;
    } catch (error) {
      pfLog(0, `${WebdavApi.L}._parseMultiplePropsFromXml() parsing error`, error);
      return [];
    }
  }

  private async _ensureParentDirectoryExists(filePath: string): Promise<void> {
    const pathParts = filePath.split('/').filter((part) => part.length > 0);

    // Don't process if it's a root-level file
    if (pathParts.length <= 1) {
      return;
    }

    // Remove the filename to get directory path parts
    const dirParts = pathParts.slice(0, -1);

    // Create directories progressively from root to parent
    // This is only called when we get a 409 error, so we know directories are missing
    for (let i = 1; i <= dirParts.length; i++) {
      const currentPath = dirParts.slice(0, i).join('/');

      try {
        pfLog(
          2,
          `${WebdavApi.L}._ensureParentDirectoryExists() attempting to create directory: ${currentPath}`,
        );
        await this.createFolder({ folderPath: currentPath });
        pfLog(
          2,
          `${WebdavApi.L}._ensureParentDirectoryExists() successfully created directory: ${currentPath}`,
        );
      } catch (error: any) {
        pfLog(
          1,
          `${WebdavApi.L}._ensureParentDirectoryExists() error creating directory: ${currentPath}`,
          error,
        );

        // Handle specific error cases
        if (error?.status === 403 || error?.status === 401) {
          // Permission errors - don't continue
          throw new Error(`Permission denied creating directory: ${currentPath}`);
        } else if (error?.status === 405) {
          // Method not allowed - MKCOL not supported, this is handled in createFolder
          pfLog(
            2,
            `${WebdavApi.L}._ensureParentDirectoryExists() MKCOL not supported for ${currentPath}`,
          );
        } else if (
          error?.message?.includes('already exists') ||
          error?.status === 409 ||
          error?.status === 405
        ) {
          // Directory already exists or conflict, continue
          pfLog(
            2,
            `${WebdavApi.L}._ensureParentDirectoryExists() directory exists or conflict for: ${currentPath}`,
          );
        } else {
          // Other errors - log but continue, let the final PUT operation fail with a clearer error
          pfLog(
            1,
            `${WebdavApi.L}._ensureParentDirectoryExists() ignoring error for ${currentPath}`,
            error,
          );
        }
      }
    }
  }

  private _validateWebDavResponse(
    response: Response,
    method: string,
    path: string,
  ): void {
    if (response.status === 404) {
      pfLog(2, `${WebdavApi.L}._validateWebDavResponse() 404 Not Found`, {
        method,
        path,
      });
      throw new RemoteFileNotFoundAPIError(path);
    }

    const validWebDavStatuses = [200, 201, 204, 206, 207, 304, 409, 412, 413, 423, 507];

    if (!validWebDavStatuses.includes(response.status)) {
      pfLog(0, `${WebdavApi.L}._validateWebDavResponse() HTTP error`, {
        method,
        path,
        status: response.status,
        statusText: response.statusText,
      });
      throw new HttpNotOkAPIError(response);
    }
  }

  private _checkCommonErrors(e: any, targetPath: string): void {
    pfLog(0, `${WebdavApi.L} API error for ${targetPath}`, e);

    const status = e?.status || e?.response?.status;
    if (status === 401 || status === 403) {
      throw new AuthFailSPError(`WebDAV ${status}`, targetPath);
    }
  }

  private async _handleUploadConflict(
    path: string,
    data: string,
    headers: Record<string, string>,
  ): Promise<string | undefined> {
    try {
      pfLog(
        1,
        `${WebdavApi.L}.upload() 409 conflict, attempting directory creation for ${path}`,
      );
      await this._ensureParentDirectoryExists(path);

      const retryResponse = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers,
      });

      const retryHeaderObj = this._responseHeadersToObject(retryResponse);
      return this._findEtagInHeaders(retryHeaderObj);
    } catch (retryError: any) {
      pfLog(0, `${WebdavApi.L}.upload() retry after 409 also failed`, retryError);
      throw new Error(
        `Upload failed: ${retryError?.message || 'Directory creation or upload conflict'}`,
      );
    }
  }

  private _handleUploadError(e: any, path: string, expectedEtag?: string | null): never {
    const status =
      e?.status || (e instanceof HttpNotOkAPIError ? e.response?.status : undefined);

    const errorMessages: Record<number, string | (() => never)> = {
      412: () => {
        if (expectedEtag) {
          throw new Error(
            `Upload failed: file was modified (expected etag: ${expectedEtag})`,
          );
        } else {
          throw new FileExistsAPIError();
        }
      },
      413: `File too large: ${path}`,
      423: `Resource is locked: ${path}`,
      507: `Insufficient storage space for: ${path}`,
    };

    const errorHandler = errorMessages[status];
    if (typeof errorHandler === 'function') {
      errorHandler();
    } else if (errorHandler) {
      throw new Error(errorHandler);
    }
    throw e;
  }

  private _handleDownloadError(e: any, path: string): never {
    const status =
      e?.status || (e instanceof HttpNotOkAPIError ? e.response?.status : undefined);

    const errorMessages: Record<number, string | Error> = {
      304: e, // Not Modified - rethrow as is
      404: new RemoteFileNotFoundAPIError(path),
      416: new Error(`Invalid range request for: ${path}`),
      423: new Error(`Resource is locked: ${path}`),
    };

    const error = errorMessages[status];
    if (error) {
      throw error;
    }
    throw e;
  }

  private _handleRemoveError(e: any, path: string, expectedEtag?: string): void {
    const status =
      e?.status || (e instanceof HttpNotOkAPIError ? e.response?.status : undefined);

    if (status === 404) {
      // Not Found - resource doesn't exist, consider this success
      pfLog(2, `${WebdavApi.L}.remove() resource not found (already deleted): ${path}`);
      return;
    }

    const errorMessages: Record<number, string | (() => never)> = {
      412: () => {
        if (expectedEtag) {
          throw new Error(
            `Delete failed: resource was modified (expected etag: ${expectedEtag})`,
          );
        }
        throw e;
      },
      423: `Cannot delete locked resource: ${path}`,
      424: `Delete failed due to dependency: ${path}`,
      409: `Delete conflict (non-empty directory?): ${path}`,
    };

    const errorHandler = errorMessages[status];
    if (typeof errorHandler === 'function') {
      errorHandler();
    } else if (errorHandler) {
      throw new Error(errorHandler);
    }
    throw e;
  }
}
