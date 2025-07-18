import { RemoteFileNotFoundAPIError } from '../../../errors/errors';
import { PFLog } from '../../../../../core/log';
import { WebdavServerCapabilities, WebdavPrivateCfg } from './webdav.model';

export class WebdavCapabilitiesDetector {
  private static readonly L = 'WebdavCapabilitiesDetector';
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

  private _cachedCapabilities?: WebdavServerCapabilities;

  constructor(
    private _makeRequest: (options: {
      method: string;
      path: string;
      body?: string | null;
      headers?: Record<string, string>;
    }) => Promise<Response>,
  ) {}

  /**
   * Get or detect server capabilities with caching
   */
  async getOrDetectCapabilities(
    cfg: WebdavPrivateCfg,
  ): Promise<WebdavServerCapabilities> {
    if (this._cachedCapabilities) {
      return this._cachedCapabilities;
    }

    if (cfg.serverCapabilities) {
      this._cachedCapabilities = cfg.serverCapabilities;
      return this._cachedCapabilities;
    }

    // Detect capabilities if not cached
    // Use an empty path for capability detection to test the base URL
    // This avoids 404 errors for paths that don't exist yet
    return await this.detectServerCapabilities('');
  }

  /**
   * Clear cached capabilities (useful for forcing re-detection)
   */
  clearCache(): void {
    this._cachedCapabilities = undefined;
  }

  /**
   * Detect server capabilities by testing a simple file operation
   * Caches results to avoid repeated detection calls
   */
  async detectServerCapabilities(
    testPath: string = '',
  ): Promise<WebdavServerCapabilities> {
    if (this._cachedCapabilities) {
      return this._cachedCapabilities;
    }

    const capabilities: WebdavServerCapabilities = {
      supportsETags: false,
      supportsIfHeader: false,
      supportsLastModified: false,
    };

    try {
      // Test ETag support with a simple PROPFIND request
      const response = await this._makeRequest({
        method: 'PROPFIND',
        path: testPath,
        body: WebdavCapabilitiesDetector.PROPFIND_XML,
        headers: {
          /* eslint-disable @typescript-eslint/naming-convention */
          'Content-Type': 'application/xml',
          Depth: '0',
          /* eslint-enable @typescript-eslint/naming-convention */
        },
      });

      const headers = this._responseHeadersToObject(response);
      const xmlText = await response.text();

      // Check for ETag support (case-insensitive XML check)
      const etag = this._findEtagInHeaders(headers);
      const xmlLower = xmlText.toLowerCase();
      if (etag || xmlLower.includes('<d:getetag>') || xmlLower.includes('<getetag>')) {
        capabilities.supportsETags = true;
      }

      // Check for Last-Modified support (case-insensitive XML check)
      const lastModified = headers['last-modified'];
      if (
        lastModified ||
        xmlLower.includes('<d:getlastmodified>') ||
        xmlLower.includes('<getlastmodified>')
      ) {
        capabilities.supportsLastModified = true;
      }

      // Basic WebDAV support implies If header support
      if (response.status === 207) {
        // Multi-Status indicates WebDAV support
        capabilities.supportsIfHeader = true;
      }

      PFLog.normal(
        `${WebdavCapabilitiesDetector.L}.detectServerCapabilities() detected`,
        capabilities,
      );
    } catch (error: any) {
      // Don't log 404 errors as errors - they're expected when the path doesn't exist yet
      if (error?.status === 404 || error instanceof RemoteFileNotFoundAPIError) {
        PFLog.debug(
          `${WebdavCapabilitiesDetector.L}.detectServerCapabilities() path not found (expected on first sync)`,
          { path: testPath, error: error?.message },
        );
      } else {
        PFLog.err(
          `${WebdavCapabilitiesDetector.L}.detectServerCapabilities() failed`,
          error,
        );
      }
      // Assume minimal capabilities on detection failure
      capabilities.supportsLastModified = true; // Most basic HTTP servers support this
    }

    this._cachedCapabilities = capabilities;
    return capabilities;
  }

  private _responseHeadersToObject(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }

  private _findEtagInHeaders(headers: Record<string, string>): string {
    const etagKey = this._findEtagKeyInObject(headers);
    return etagKey ? headers[etagKey] : '';
  }

  private _findEtagKeyInObject(obj: Record<string, any>): string | undefined {
    // Standard etag headers (case-insensitive search)
    const possibleEtagKeys = ['etag', 'oc-etag', 'oc:etag', 'getetag', 'x-oc-etag'];
    return Object.keys(obj).find((key) => possibleEtagKeys.includes(key.toLowerCase()));
  }
}
