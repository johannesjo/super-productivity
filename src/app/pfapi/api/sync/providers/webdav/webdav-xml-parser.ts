import { PFLog } from '../../../../../core/log';
import { RemoteFileNotFoundAPIError } from '../../../errors/errors';

export interface FileMeta {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: string;
  etag: string;
  data: Record<string, string>;
}

export class WebdavXmlParser {
  private static readonly L = 'WebdavXmlParser';
  static readonly PROPFIND_XML = `<?xml version="1.0" encoding="utf-8" ?>
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

  constructor(private _cleanRev: (rev: string) => string) {}

  /**
   * Validates that response content is not an HTML error page
   * Used by operations that expect specific content types
   */
  validateResponseContent(
    content: string,
    path: string,
    operation: string,
    expectedContentDescription: string = 'content',
  ): void {
    if (this.isHtmlResponse(content)) {
      PFLog.error(
        `${WebdavXmlParser.L}.${operation}() received HTML error page instead of ${expectedContentDescription}`,
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
  validateAndParseXmlResponse(
    xmlText: string,
    path: string,
    operation: string = 'XML operation',
  ): FileMeta {
    this.validateResponseContent(xmlText, path, operation, 'XML');

    const fileMeta = this.parsePropsFromXml(xmlText, path);

    if (!fileMeta) {
      throw new RemoteFileNotFoundAPIError(path);
    }

    return fileMeta;
  }

  /**
   * Check if response is HTML instead of expected content
   */
  isHtmlResponse(text: string): boolean {
    const trimmed = text.trim().toLowerCase();
    return (
      trimmed.startsWith('<!doctype html') ||
      trimmed.startsWith('<html') ||
      text.includes('There is nothing here, sorry')
    );
  }

  /**
   * Parse XML response from PROPFIND into FileMeta
   */
  parsePropsFromXml(xmlText: string, requestPath: string): FileMeta | null {
    try {
      // Check if xmlText is empty or not valid XML
      if (!xmlText || xmlText.trim() === '') {
        PFLog.err(`${WebdavXmlParser.L}.parsePropsFromXml() Empty XML response`);
        return null;
      }

      // Check if response is HTML instead of XML
      if (this.isHtmlResponse(xmlText)) {
        PFLog.err(
          `${WebdavXmlParser.L}.parsePropsFromXml() Received HTML instead of XML`,
          {
            requestPath,
            responseSnippet: xmlText.substring(0, 200),
          },
        );
        return null;
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        PFLog.err(
          `${WebdavXmlParser.L}.parsePropsFromXml() XML parsing error`,
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
          return this.parseXmlResponseElement(response, requestPath);
        }
      }

      PFLog.err(
        `${WebdavXmlParser.L}.parsePropsFromXml() No matching response found for path: ${requestPath}`,
      );
      return null;
    } catch (error) {
      PFLog.err(`${WebdavXmlParser.L}.parsePropsFromXml() parsing error`, error);
      return null;
    }
  }

  /**
   * Parse multiple file entries from PROPFIND XML response
   */
  parseMultiplePropsFromXml(xmlText: string, basePath: string): FileMeta[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        PFLog.err(
          `${WebdavXmlParser.L}.parseMultiplePropsFromXml() XML parsing error`,
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

        const fileMeta = this.parseXmlResponseElement(response, decodedHref);
        if (fileMeta) {
          results.push(fileMeta);
        }
      }

      return results;
    } catch (error) {
      PFLog.err(`${WebdavXmlParser.L}.parseMultiplePropsFromXml() parsing error`, error);
      return [];
    }
  }

  /**
   * Parse a single response element from WebDAV XML
   */
  private parseXmlResponseElement(
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
    const isCollection =
      resourceType !== null && resourceType.querySelector('collection') !== null;

    // Determine the validator to use
    const cleanedEtag = this._cleanRev(etag);
    const validator = cleanedEtag || lastModified;

    return {
      filename: displayname || decodedHref.split('/').pop() || '',
      basename: displayname || decodedHref.split('/').pop() || '',
      lastmod: lastModified,
      size: parseInt(contentLength, 10),
      type: isCollection ? 'directory' : 'file',
      etag: validator,
      data: {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': contentType,
        'content-length': contentLength,
        'last-modified': lastModified,
        /* eslint-enable @typescript-eslint/naming-convention */
        etag: etag,
        href: decodedHref,
      },
    };
  }

  /**
   * Check multi-status response for errors (used by DELETE operations)
   */
  async checkDeleteMultiStatusResponse(
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
            `${WebdavXmlParser.L}.checkDeleteMultiStatusResponse() deletion failed for`,
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
        `${WebdavXmlParser.L}.checkDeleteMultiStatusResponse() XML parsing error`,
        parseError,
      );
      return false; // Assume success if we can't parse the response
    }
  }
}
