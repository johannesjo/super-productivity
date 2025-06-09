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
    expectedEtag,
  }: {
    data: string;
    path: string;
    isOverwrite?: boolean;
    expectedEtag?: string | null;
  }): Promise<string | undefined> {
    try {
      // Enhanced WebDAV PUT with proper conditional headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
        'Content-Length': new Blob([data]).size.toString(),
      };

      // Add conditional headers for WebDAV compliance
      if (!isOverwrite) {
        if (expectedEtag) {
          // If we expect a specific etag, use If-Match to ensure atomicity
          headers['If-Match'] = expectedEtag;
        } else {
          // If we don't want to overwrite, use If-None-Match: *
          headers['If-None-Match'] = '*';
        }
      } else if (expectedEtag) {
        // For overwrite with expected etag, use If-Match
        headers['If-Match'] = expectedEtag;
      }

      // Ensure parent directory exists before upload
      await this._ensureParentDirectoryExists(path);

      const response = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers,
      });

      // Extract etag from response headers
      const responseHeaderObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaderObj[key.toLowerCase()] = value;
      });

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
      switch (e?.status) {
        case 409:
          // Conflict - parent directory doesn't exist or other conflict
          // Try one more time to create parent directories and retry
          try {
            pfLog(
              1,
              `${WebdavApi.L}.upload() 409 conflict, attempting directory creation for ${path}`,
            );
            await this._ensureParentDirectoryExists(path);

            // Retry the upload once - recreate headers
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/octet-stream',
              'Content-Length': new Blob([data]).size.toString(),
            };

            // Re-apply conditional headers for retry
            if (!isOverwrite) {
              if (expectedEtag) {
                retryHeaders['If-Match'] = expectedEtag;
              } else {
                retryHeaders['If-None-Match'] = '*';
              }
            } else if (expectedEtag) {
              retryHeaders['If-Match'] = expectedEtag;
            }

            const retryResponse = await this._makeRequest({
              method: 'PUT',
              path,
              body: data,
              headers: retryHeaders,
            });

            const retryHeaderObj: Record<string, string> = {};
            retryResponse.headers.forEach((value, key) => {
              retryHeaderObj[key.toLowerCase()] = value;
            });

            return this._findEtagInHeaders(retryHeaderObj);
          } catch (retryError: any) {
            pfLog(0, `${WebdavApi.L}.upload() retry after 409 also failed`, retryError);
            throw new Error(
              `Upload failed: ${retryError?.message || 'Directory creation or upload conflict'}`,
            );
          }
        case 412:
          // Precondition Failed - conditional header failed
          if (expectedEtag) {
            throw new Error(
              `Upload failed: file was modified (expected etag: ${expectedEtag})`,
            );
          } else {
            throw new FileExistsAPIError();
          }
        case 413:
          // Payload Too Large
          throw new Error(`File too large: ${path}`);
        case 507:
          // Insufficient Storage
          throw new Error(`Insufficient storage space for: ${path}`);
        case 423:
          // Locked
          throw new Error(`Resource is locked: ${path}`);
        default:
          throw e;
      }
    }
  }

  async getFileMeta(path: string, localRev: string | null): Promise<FileMeta> {
    try {
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

      // Check if response is HTML instead of XML (common with some WebDAV servers)
      if (
        xmlText.trim().toLowerCase().startsWith('<!doctype html') ||
        xmlText.trim().toLowerCase().startsWith('<html')
      ) {
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
    try {
      const headers: Record<string, string> = {};

      // Add conditional headers for efficient downloading
      if (localRev) {
        // Use If-None-Match to avoid downloading if file hasn't changed
        headers['If-None-Match'] = localRev;
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
        throw new Error(`File not modified: ${path}`);
      }

      if (response.status === 206) {
        // Partial Content - range request successful
        pfLog(2, `${WebdavApi.L}.download() received partial content for ${path}`);
      }

      // Get response data
      const dataStr = await response.text();

      // Check if response is HTML instead of file content (common with some WebDAV servers on 404)
      if (
        dataStr.trim().toLowerCase().startsWith('<!doctype html') ||
        dataStr.trim().toLowerCase().startsWith('<html') ||
        dataStr.includes('There is nothing here, sorry')
      ) {
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
      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key.toLowerCase()] = value;
      });

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
          // If PROPFIND also fails, generate a hash-based revision
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

      // Enhanced error handling
      switch (e?.status) {
        case 304:
          // Not Modified - rethrow as is since this might be expected
          throw e;
        case 404:
          // Not Found - file doesn't exist
          throw new RemoteFileNotFoundAPIError(path);
        case 416:
          // Range Not Satisfiable
          throw new Error(`Invalid range request for: ${path}`);
        case 423:
          // Locked
          throw new Error(`Resource is locked: ${path}`);
        default:
          throw e;
      }
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

      // Enhanced error handling for WebDAV DELETE
      switch (e?.status) {
        case 404:
          // Not Found - resource doesn't exist, consider this success
          pfLog(
            2,
            `${WebdavApi.L}.remove() resource not found (already deleted): ${path}`,
          );
          return;
        case 412:
          // Precondition Failed - etag mismatch
          if (expectedEtag) {
            throw new Error(
              `Delete failed: resource was modified (expected etag: ${expectedEtag})`,
            );
          }
          throw e;
        case 423:
          // Locked
          throw new Error(`Cannot delete locked resource: ${path}`);
        case 424:
          // Failed Dependency
          throw new Error(`Delete failed due to dependency: ${path}`);
        case 409:
          // Conflict - might be non-empty directory
          throw new Error(`Delete conflict (non-empty directory?): ${path}`);
        default:
          throw e;
      }
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
      const validWebDavStatuses = [
        200, // OK
        201, // Created
        204, // No Content
        206, // Partial Content
        207, // Multi-Status
        304, // Not Modified (for conditional requests)
        404, // Not Found (let calling methods handle this)
        409, // Conflict (let calling methods handle this)
        412, // Precondition Failed (let calling methods handle this)
        423, // Locked (let calling methods handle this)
      ];

      if (!validWebDavStatuses.includes(response.status)) {
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

  private async _ensureParentDirectoryExists(filePath: string): Promise<void> {
    const pathParts = filePath.split('/').filter((part) => part.length > 0);

    // Don't process if it's a root-level file
    if (pathParts.length <= 1) {
      return;
    }

    // Remove the filename to get directory path parts
    const dirParts = pathParts.slice(0, -1);

    // Create directories progressively from root to parent
    // Use optimistic creation - just try to create each directory
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

  private _checkCommonErrors(e: any, targetPath: string): void {
    pfLog(0, `${WebdavApi.L} API error for ${targetPath}`, e);

    const status = e?.status || e?.response?.status;
    // Handle common HTTP error codes
    switch (status) {
      case 401:
      case 403:
        throw new AuthFailSPError(`WebDAV ${e.status}`, targetPath);
      case 207:
        // Multi-Status is normal for WebDAV PROPFIND responses
        break;
      // Note: Removed automatic 404 handling to let calling methods decide
      // how to handle "Not Found" responses (some may expect them)
    }
  }
}
