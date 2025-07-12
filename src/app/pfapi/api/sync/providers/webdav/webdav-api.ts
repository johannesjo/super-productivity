import { WebdavPrivateCfg } from './webdav';
import {
  AuthFailSPError,
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';
import { PFLog } from '../../../../../core/log';
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

  // Make IS_ANDROID_WEB_VIEW testable by making it a class property
  protected get isAndroidWebView(): boolean {
    return IS_ANDROID_WEB_VIEW;
  }

  constructor(private _getCfgOrError: () => Promise<WebdavPrivateCfg>) {}

  // Utility methods to reduce duplication
  /**
   * Common upload retry logic for 404 and 409 errors
   * Creates parent directories and retries the upload request
   */
  private async _retryUploadWithDirectoryCreation(
    path: string,
    data: string,
    headers: Record<string, string>,
    errorCode: number,
  ): Promise<string> {
    const context = errorCode === 404 ? 'upload-404-retry' : 'upload-409-retry';
    PFLog.error(
      `${WebdavApi.L}.upload() ${errorCode} ${errorCode === 404 ? 'not found' : 'conflict'}, attempting to create parent directories`,
      { path },
    );

    try {
      await this._ensureParentDirectoryExists(path);

      // Retry the upload
      const retryResponse = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers,
      });

      const retryHeaderObj = this._responseHeadersToObject(retryResponse);
      const retryEtag = this._findEtagInHeaders(retryHeaderObj);

      if (!retryEtag) {
        return await this._retrieveEtagWithFallback(path, retryHeaderObj, context);
      }

      return retryEtag;
    } catch (retryError: any) {
      PFLog.err(`${WebdavApi.L}.upload() retry after ${errorCode} failed`, retryError);
      if (retryError instanceof RemoteFileNotFoundAPIError) {
        throw retryError;
      }
      if (retryError instanceof NoEtagAPIError) {
        throw retryError;
      }
      throw new Error(
        `Upload failed after creating directories: ${retryError?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Validates that response content is not an HTML error page
   * Used by operations that expect specific content types
   */
  private _validateResponseContent(
    content: string,
    path: string,
    operation: string,
    expectedContentDescription: string = 'content',
  ): void {
    if (this._isHtmlResponse(content)) {
      PFLog.error(
        `${WebdavApi.L}.${operation}() received HTML error page instead of ${expectedContentDescription}`,
        {
          path,
          responseSnippet: content.substring(0, 200),
        },
      );
      throw new RemoteFileNotFoundAPIError(path);
    }
  }

  /**
   * Validates XML response and throws appropriate error if HTML error page is received
   * Used by operations that expect XML responses (PROPFIND, etc.)
   */
  private _validateAndParseXmlResponse(
    xmlText: string,
    path: string,
    operation: string = 'XML operation',
  ): FileMeta {
    this._validateResponseContent(xmlText, path, operation, 'XML');

    const fileMeta = this._parsePropsFromXml(xmlText, path);

    if (!fileMeta) {
      throw new RemoteFileNotFoundAPIError(path);
    }

    return fileMeta;
  }

  /**
   * Common ETag retrieval fallback chain: response headers -> PROPFIND -> GET (optional)
   * Used by upload, download, and other operations that need ETags
   */
  private async _retrieveEtagWithFallback(
    path: string,
    headers?: Record<string, string>,
    context: string = 'operation',
  ): Promise<string> {
    // Try response headers first if provided
    if (headers) {
      const etag = this._findEtagInHeaders(headers);
      if (etag) {
        return etag;
      }
    }

    // Fallback to PROPFIND
    try {
      const meta = await this.getFileMeta(path, null);
      return meta.etag;
    } catch (metaError) {
      PFLog.err(`${WebdavApi.L}.${context}() failed to get etag via PROPFIND`, metaError);

      // Last resort: try GET request to retrieve ETag
      try {
        PFLog.error(
          `${WebdavApi.L}.${context}() attempting GET request fallback for etag`,
        );
        const { rev } = await this.download({ path });
        return rev;
      } catch (getError) {
        PFLog.err(
          `${WebdavApi.L}.${context}() GET request fallback also failed`,
          getError,
        );
        throw new NoEtagAPIError({
          path,
          attemptedMethods: ['response-headers', 'PROPFIND', 'GET'],
        });
      }
    }
  }
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Length': new Blob([data]).size.toString(),
      ...this._createConditionalHeaders(isOverwrite, expectedEtag),
    };

    try {
      const response = await this._makeRequest({
        method: 'PUT',
        path,
        body: data,
        headers,
      });

      // Extract etag from response headers
      const responseHeaderObj = this._responseHeadersToObject(response);
      const etag = this._findEtagInHeaders(responseHeaderObj);

      if (!etag) {
        return await this._retrieveEtagWithFallback(path, responseHeaderObj, 'upload');
      }

      return etag;
    } catch (e: any) {
      PFLog.err(`${WebdavApi.L}.upload() error`, { path, error: e });

      // Check if it's a RemoteFileNotFoundAPIError (404)
      if (e instanceof RemoteFileNotFoundAPIError || e?.status === 404) {
        // Not found - parent directory might not exist (some WebDAV servers return 404 instead of 409)
        return await this._retryUploadWithDirectoryCreation(path, data, headers, 404);
      }

      // Enhanced error handling for WebDAV-specific scenarios
      switch (e?.status) {
        case 409:
          // Conflict - parent directory doesn't exist
          return await this._retryUploadWithDirectoryCreation(path, data, headers, 409);
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

  async getFileMeta(
    path: string,
    localRev: string | null,
    useGetFallback: boolean = false,
  ): Promise<FileMeta> {
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
      return this._validateAndParseXmlResponse(xmlText, path, 'getFileMeta');
    } catch (e: any) {
      if (e?.status === 404) {
        throw new RemoteFileNotFoundAPIError(path);
      }

      // Fallback to HEAD request if PROPFIND fails
      if (e?.message?.includes('PROPFIND')) {
        try {
          const headResponse = await this._makeRequest({
            method: 'HEAD',
            path,
            ifNoneMatch: localRev,
          });

          const headers = this._responseHeadersToObject(headResponse);
          const etag = this._findEtagInHeaders(headers);
          const contentLength = headers['content-length'] || '0';
          const lastModified = headers['last-modified'] || '';
          const contentType = headers['content-type'] || '';

          return {
            filename: path.split('/').pop() || '',
            basename: path.split('/').pop() || '',
            lastmod: lastModified,
            size: parseInt(contentLength, 10),
            type: 'file',
            etag: this._cleanRev(etag),
            data: {
              'content-type': contentType,
              'content-length': contentLength,
              'last-modified': lastModified,
              etag: etag,
              href: path,
            },
          };
        } catch (headError: any) {
          if (headError?.status === 404) {
            throw new RemoteFileNotFoundAPIError(path);
          }

          // If HEAD also fails and useGetFallback is enabled, try GET as last resort
          if (useGetFallback) {
            try {
              PFLog.error(`${WebdavApi.L}.getFileMeta() attempting GET request fallback`);
              const { rev } = await this.download({ path });

              // Since we only have the ETag from GET, create minimal metadata
              return {
                filename: path.split('/').pop() || '',
                basename: path.split('/').pop() || '',
                lastmod: new Date().toISOString(),
                size: 0, // Size unknown from GET fallback
                type: 'file',
                etag: rev,
                data: {
                  etag: rev,
                  href: path,
                },
              };
            } catch (getError: any) {
              PFLog.err(
                `${WebdavApi.L}.getFileMeta() GET fallback also failed`,
                getError,
              );
              if (getError?.status === 404) {
                throw new RemoteFileNotFoundAPIError(path);
              }
              throw getError;
            }
          }

          throw headError;
        }
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
        const error = new Error(`File not modified: ${path}`);
        (error as any).status = 304;
        (error as any).localRev = localRev;
        throw error;
      }

      if (response.status === 206) {
        // Partial Content - range request successful
        PFLog.normal(`${WebdavApi.L}.download() received partial content for ${path}`);
      }

      // Get response data
      const dataStr = await response.text();

      // Validate that we didn't receive an HTML error page
      this._validateResponseContent(dataStr, path, 'download', 'file content');

      // Validate response content
      if (!dataStr && response.status === 200) {
        PFLog.error(`${WebdavApi.L}.download() received empty content for ${path}`);
        // Empty file is valid in some cases, but log it
      }

      // Extract headers
      const headerObj = this._responseHeadersToObject(response);

      // Get etag/revision
      const rev = this._findEtagInHeaders(headerObj);

      if (!rev) {
        PFLog.error(`${WebdavApi.L}.download() no etag in response headers`, {
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
          PFLog.err(`${WebdavApi.L}.download() PROPFIND fallback failed`, metaError);
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
              PFLog.err(`${WebdavApi.L}.download() hash generation failed`, hashError);
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
      PFLog.err(`${WebdavApi.L}.download() error`, { path, error: e });

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
        if (
          checkError?.status === 404 ||
          checkError instanceof RemoteFileNotFoundAPIError
        ) {
          // Resource doesn't exist, consider deletion successful
          PFLog.normal(`${WebdavApi.L}.remove() resource already doesn't exist: ${path}`);
          return;
        }
        // If we can't check, proceed with deletion anyway
        PFLog.error(
          `${WebdavApi.L}.remove() couldn't check resource before deletion`,
          checkError,
        );
      }

      // Add Depth header for collections (directories)
      if (resourceType === 'directory') {
        headers['Depth'] = 'infinity'; // Delete directory and all contents
        PFLog.normal(
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

      PFLog.normal(`${WebdavApi.L}.remove() successfully deleted: ${path}`);
    } catch (e: any) {
      PFLog.err(`${WebdavApi.L}.remove() error`, { path, error: e });

      // Enhanced error handling for WebDAV DELETE
      if (e instanceof RemoteFileNotFoundAPIError || e?.status === 404) {
        // Not Found - resource doesn't exist, consider this success
        PFLog.normal(
          `${WebdavApi.L}.remove() resource not found (already deleted): ${path}`,
        );
        return;
      }

      switch (e?.status) {
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
          PFLog.err(
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
      PFLog.err(
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
      if (e?.status === 404 || e instanceof RemoteFileNotFoundAPIError) {
        return false;
      }
      throw e;
    }
  }

  async checkFolderExists(path: string): Promise<boolean> {
    try {
      const meta = await this.getFileMeta(path, null);
      return meta.type === 'directory';
    } catch (e: any) {
      if (e?.status === 404 || e instanceof RemoteFileNotFoundAPIError) {
        return false;
      }
      // Some servers return 405 for PROPFIND on non-existent folders
      if (e?.status === 405) {
        return false;
      }
      throw e;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const cfg = await this._getCfgOrError();
    try {
      // Try to check if root exists
      PFLog.error(`${WebdavApi.L}.testConnection() testing WebDAV connection`, {
        baseUrl: cfg.baseUrl,
      });

      // Try a simple PROPFIND on the root
      const response = await this._makeRequest({
        method: 'PROPFIND',
        path: '',
        body: WebdavApi.PROPFIND_XML,
        headers: {
          'Content-Type': 'application/xml',
          Depth: '0',
        },
      });

      return {
        success: true,
        message: 'WebDAV connection successful',
        details: {
          baseUrl: cfg.baseUrl,
          status: response.status,
        },
      };
    } catch (error: any) {
      PFLog.err(`${WebdavApi.L}.testConnection() failed`, { error });
      return {
        success: false,
        message: `WebDAV connection failed: ${error?.message || 'Unknown error'}`,
        details: {
          baseUrl: cfg.baseUrl,
          error: error?.message,
          status: error?.status,
        },
      };
    }
  }

  getRevFromMetaHelper(fileMeta: unknown | Headers): string {
    const d = (fileMeta as any)?.data || fileMeta;

    // Case-insensitive search for etag
    const etagKey = this._findEtagKeyInObject(d);
    if (etagKey && d[etagKey]) {
      return this._cleanRev(d[etagKey]);
    }

    PFLog.err(`${WebdavApi.L}.getRevFromMeta() No etag found in metadata`, {
      availableKeys: Object.keys(d),
      metadata: d,
    });
    throw new NoEtagAPIError(fileMeta);
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    PFLog.normal(`${WebdavApi.L}.createFolder() attempting to create folder`, {
      folderPath,
    });

    // Ensure folder path has trailing slash for MKCOL requests
    const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

    try {
      await this._makeRequest({
        method: 'MKCOL',
        path: normalizedFolderPath,
      });
      PFLog.normal(
        `${WebdavApi.L}.createFolder() successfully created folder with MKCOL`,
        {
          folderPath,
        },
      );
    } catch (e: any) {
      PFLog.err(`${WebdavApi.L}.createFolder() MKCOL error`, {
        folderPath,
        error: e,
        status: e?.status,
        message: e?.message,
      });

      // If MKCOL is not supported (including on Android where CapacitorHttp doesn't support it)
      // OR if we get a 404 (which might mean the parent doesn't exist in Nextcloud)
      if (
        e?.message?.includes('Method not allowed') ||
        e?.status === 405 ||
        e?.status === 404 ||
        e?.message?.includes('Expected one of') ||
        e?.message?.includes('MKCOL') ||
        e instanceof RemoteFileNotFoundAPIError
      ) {
        PFLog.normal(
          `${WebdavApi.L}.createFolder() MKCOL failed with status ${e?.status}, trying PUT fallback`,
        );
        try {
          const putPath = `${normalizedFolderPath}.folder`;
          PFLog.normal(`${WebdavApi.L}.createFolder() attempting PUT to`, { putPath });

          await this._makeRequest({
            method: 'PUT',
            path: putPath,
            body: '',
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': '0',
            },
          });
          PFLog.normal(
            `${WebdavApi.L}.createFolder() successfully created folder with PUT`,
            {
              folderPath,
            },
          );
        } catch (putError: any) {
          PFLog.err(`${WebdavApi.L}.createFolder() PUT fallback failed`, {
            folderPath,
            error: putError,
            status: putError?.status,
            message: putError?.message,
          });

          // If PUT also fails with 404, it might mean the parent path doesn't exist
          if (
            putError?.status === 404 ||
            putError instanceof RemoteFileNotFoundAPIError
          ) {
            // Check if we need to create parent directories first
            const pathParts = folderPath.split('/').filter((p) => p);
            if (pathParts.length > 1) {
              PFLog.normal(
                `${WebdavApi.L}.createFolder() trying to create parent directories first`,
                {
                  folderPath,
                  pathParts,
                },
              );

              // Try to create parent directories one by one
              let currentPath = '';
              for (let i = 0; i < pathParts.length - 1; i++) {
                currentPath = currentPath
                  ? `${currentPath}/${pathParts[i]}`
                  : pathParts[i];
                try {
                  const exists = await this.checkFolderExists(currentPath);
                  if (!exists) {
                    PFLog.normal(`${WebdavApi.L}.createFolder() creating parent`, {
                      currentPath,
                    });
                    await this.createFolder({ folderPath: currentPath });
                  }
                } catch (parentError) {
                  PFLog.err(`${WebdavApi.L}.createFolder() failed to create parent`, {
                    currentPath,
                    error: parentError,
                  });
                }
              }
            }

            // Try one more time with a different approach - create a .gitkeep file
            try {
              const gitkeepPath = `${normalizedFolderPath}.gitkeep`;
              PFLog.normal(`${WebdavApi.L}.createFolder() trying .gitkeep approach`, {
                gitkeepPath,
              });

              await this._makeRequest({
                method: 'PUT',
                path: gitkeepPath,
                body: '',
                headers: {
                  'Content-Type': 'text/plain',
                  'Content-Length': '0',
                },
              });
              PFLog.normal(
                `${WebdavApi.L}.createFolder() successfully created folder with .gitkeep`,
                { folderPath },
              );
              return;
            } catch (gitkeepError) {
              PFLog.err(`${WebdavApi.L}.createFolder() .gitkeep approach also failed`, {
                folderPath,
                error: gitkeepError,
              });
            }
          }

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

    // Build headers object
    const requestHeaders: Record<string, string> = {
      Authorization: this._getAuthHeader(cfg),
      ...headers,
    };

    if (ifNoneMatch) {
      requestHeaders['If-None-Match'] = ifNoneMatch;
    }

    // Use CapacitorHttp directly on Android to bypass the broken interceptor
    if (this.isAndroidWebView) {
      try {
        const capacitorResponse = await CapacitorHttp.request({
          url: this._getUrl(path, cfg),
          method: method as any, // CapacitorHttp expects specific method types
          headers: requestHeaders,
          data: body || undefined,
        });

        // Convert CapacitorHttp response to fetch Response format
        // Try to construct Response with data first, fall back to null body if it fails
        let response: Response;
        try {
          response = new Response(capacitorResponse.data, {
            status: capacitorResponse.status,
            statusText: `${capacitorResponse.status}`,
            headers: new Headers(capacitorResponse.headers || {}),
          });
        } catch (error) {
          // If Response construction fails due to null body status, try with null body
          if (error instanceof TypeError && error.message.includes('null body status')) {
            response = new Response(null, {
              status: capacitorResponse.status,
              statusText: `${capacitorResponse.status}`,
              headers: new Headers(capacitorResponse.headers || {}),
            });
          } else {
            throw error;
          }
        }

        // Handle 404 specifically to throw RemoteFileNotFoundAPIError consistently
        if (response.status === 404) {
          PFLog.normal(`${WebdavApi.L}._makeRequest() 404 Not Found`, {
            method,
            path,
          });
          throw new RemoteFileNotFoundAPIError(path);
        }

        // WebDAV specific status codes handling
        const validWebDavStatuses = [
          200, // OK
          201, // Created
          204, // No Content
          206, // Partial Content
          207, // Multi-Status
          304, // Not Modified (for conditional requests)
          405, // Method Not Allowed (let calling methods handle this)
          409, // Conflict (let calling methods handle this)
          412, // Precondition Failed (let calling methods handle this)
          416, // Range Not Satisfiable (let calling methods handle this)
          423, // Locked (let calling methods handle this)
        ];

        if (!validWebDavStatuses.includes(response.status)) {
          PFLog.err(`${WebdavApi.L}._makeRequest() HTTP error`, {
            method,
            path,
            status: response.status,
          });
          throw new HttpNotOkAPIError(response);
        }
        return response;
      } catch (e) {
        PFLog.err(`${WebdavApi.L}._makeRequest() CapacitorHttp error`, {
          method,
          path,
          error: e,
        });
        this._checkCommonErrors(e, path);
        throw e;
      }
    }

    // Use regular fetch for non-Android platforms
    const requestHeadersObj = new Headers();
    Object.entries(requestHeaders).forEach(([key, value]) => {
      requestHeadersObj.append(key, value);
    });

    try {
      const response = await fetch(this._getUrl(path, cfg), {
        method,
        headers: requestHeadersObj,
        body,
      });

      // Handle 404 specifically to throw RemoteFileNotFoundAPIError consistently
      if (response.status === 404) {
        PFLog.normal(`${WebdavApi.L}._makeRequest() 404 Not Found`, {
          method,
          path,
        });
        throw new RemoteFileNotFoundAPIError(path);
      }

      // WebDAV specific status codes handling
      const validWebDavStatuses = [
        200, // OK
        201, // Created
        204, // No Content
        206, // Partial Content
        207, // Multi-Status
        304, // Not Modified (for conditional requests)
        405, // Method Not Allowed (let calling methods handle this)
        409, // Conflict (let calling methods handle this)
        412, // Precondition Failed (let calling methods handle this)
        416, // Range Not Satisfiable (let calling methods handle this)
        423, // Locked (let calling methods handle this)
      ];

      if (!validWebDavStatuses.includes(response.status)) {
        PFLog.err(`${WebdavApi.L}._makeRequest() HTTP error`, {
          method,
          path,
          status: response.status,
          statusText: response.statusText,
        });
        throw new HttpNotOkAPIError(response);
      }
      return response;
    } catch (e) {
      PFLog.err(`${WebdavApi.L}._makeRequest() network error`, {
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

    PFLog.verbose(`${WebdavApi.L}.cleanRev() "${rev}" -> "${result}"`);
    return result;
  }

  private _getUrl(path: string, cfg: WebdavPrivateCfg): string {
    // Ensure base URL ends with a trailing slash
    const baseUrl = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;

    // Remove leading slash from path if it exists
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // Construct the URL
    const url = new URL(normalizedPath, baseUrl).toString();

    // Log for debugging - increased log level for better visibility
    PFLog.error(`${WebdavApi.L}._getUrl() constructed URL`, {
      baseUrl,
      path,
      normalizedPath,
      result: url,
      baseUrlConfig: cfg.baseUrl,
    });

    return url;
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
        PFLog.err(`${WebdavApi.L}._parsePropsFromXml() Empty XML response`);
        return null;
      }

      // Check if response is HTML instead of XML
      if (this._isHtmlResponse(xmlText)) {
        PFLog.err(`${WebdavApi.L}._parsePropsFromXml() Received HTML instead of XML`, {
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
        PFLog.err(
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

      PFLog.err(
        `${WebdavApi.L}._parsePropsFromXml() No matching response found for path: ${requestPath}`,
      );
      return null;
    } catch (error) {
      PFLog.err(`${WebdavApi.L}._parsePropsFromXml() parsing error`, error);
      return null;
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
      // Return empty array if PROPFIND is not supported
      if (e?.message?.includes('PROPFIND')) {
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
        PFLog.err(
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
        // Normalize both paths: remove leading/trailing slashes for comparison
        const normalizedHref = decodedHref.replace(/^\//, '').replace(/\/$/, '');
        const normalizedBasePath = basePath.replace(/^\//, '').replace(/\/$/, '');

        if (normalizedHref === normalizedBasePath) {
          continue;
        }

        const fileMeta = this._parseXmlResponseElement(response, decodedHref);
        if (fileMeta) {
          results.push(fileMeta);
        }
      }

      return results;
    } catch (error) {
      PFLog.err(`${WebdavApi.L}._parseMultiplePropsFromXml() parsing error`, error);
      return [];
    }
  }

  private async _ensureParentDirectoryExists(filePath: string): Promise<void> {
    PFLog.normal(`${WebdavApi.L}._ensureParentDirectoryExists() called for`, {
      filePath,
    });

    const pathParts = filePath.split('/').filter((part) => part.length > 0);

    // Don't process if it's a root-level file
    if (pathParts.length <= 1) {
      PFLog.normal(
        `${WebdavApi.L}._ensureParentDirectoryExists() no parent directory needed for root-level file`,
      );
      return;
    }

    // Remove the filename to get directory path parts
    const dirParts = pathParts.slice(0, -1);
    PFLog.normal(`${WebdavApi.L}._ensureParentDirectoryExists() directory parts`, {
      dirParts,
    });

    // Create directories progressively from root to parent
    // Use optimistic creation - just try to create each directory
    for (let i = 1; i <= dirParts.length; i++) {
      const currentPath = dirParts.slice(0, i).join('/');

      try {
        PFLog.normal(
          `${WebdavApi.L}._ensureParentDirectoryExists() attempting to create directory: ${currentPath}`,
        );
        await this.createFolder({ folderPath: currentPath });
        PFLog.normal(
          `${WebdavApi.L}._ensureParentDirectoryExists() successfully created directory: ${currentPath}`,
        );
      } catch (error: any) {
        PFLog.error(
          `${WebdavApi.L}._ensureParentDirectoryExists() error creating directory: ${currentPath}`,
          {
            error,
            status: error?.status,
            message: error?.message,
          },
        );

        // Check if it's a 404 error, which might indicate the parent doesn't exist
        if (error?.status === 404 || error instanceof RemoteFileNotFoundAPIError) {
          PFLog.err(
            `${WebdavApi.L}._ensureParentDirectoryExists() got 404 for directory creation, this might indicate a path issue`,
            { currentPath },
          );
        }

        // Log the error but continue - let the actual upload operation fail with a clearer error
        PFLog.error(
          `${WebdavApi.L}._ensureParentDirectoryExists() ignoring error for ${currentPath}`,
          error,
        );
      }
    }
  }

  private _checkCommonErrors(e: any, targetPath: string): void {
    PFLog.err(`${WebdavApi.L} API error for ${targetPath}`, e);

    const status = e?.status || e?.response?.status;
    // Handle common HTTP error codes
    switch (status) {
      case 401:
      case 403:
        throw new AuthFailSPError(`WebDAV ${status}`, targetPath);
      case 207:
        // Multi-Status is normal for WebDAV PROPFIND responses
        break;
      // Note: Removed automatic 404 handling to let calling methods decide
      // how to handle "Not Found" responses (some may expect them)
    }
  }
}
