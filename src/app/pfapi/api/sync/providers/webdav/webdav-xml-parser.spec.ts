import { WebdavXmlParser } from './webdav-xml-parser';

describe('WebdavXmlParser', () => {
  let parser: WebdavXmlParser;

  beforeEach(() => {
    parser = new WebdavXmlParser((rev: string) => rev.replace(/"/g, ''));
  });

  describe('PROPFIND_XML', () => {
    it('should have correct PROPFIND XML structure', () => {
      expect(WebdavXmlParser.PROPFIND_XML).toContain(
        '<?xml version="1.0" encoding="utf-8" ?>',
      );
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:propfind');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:prop>');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:getlastmodified/>');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:getetag/>');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:getcontenttype/>');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:resourcetype/>');
      expect(WebdavXmlParser.PROPFIND_XML).toContain('<D:getcontentlength/>');
    });
  });

  describe('validateResponseContent', () => {
    it('should not throw for valid file content', () => {
      const validContent = 'This is valid file content';
      expect(() => {
        parser.validateResponseContent(validContent, '/test.txt', 'download', 'file');
      }).not.toThrow();
    });

    it('should throw for HTML error pages', () => {
      const htmlError = '<!DOCTYPE html><html><body>404 Not Found</body></html>';
      expect(() => {
        parser.validateResponseContent(htmlError, '/test.txt', 'download', 'file');
      }).toThrow();
    });

    it('should throw for content starting with <!doctype html', () => {
      const htmlContent = '<!doctype html><html><body>Error</body></html>';
      expect(() => {
        parser.validateResponseContent(htmlContent, '/test.txt', 'download', 'file');
      }).toThrow();
    });

    it('should not throw for empty content', () => {
      expect(() => {
        parser.validateResponseContent('', '/test.txt', 'download', 'file');
      }).not.toThrow();
    });
  });

  describe('parseMultiplePropsFromXml', () => {
    it('should parse valid PROPFIND response with single file', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
                <d:getetag>"abc123"</d:getetag>
                <d:getcontentlength>1234</d:getcontentlength>
                <d:getcontenttype>text/plain</d:getcontenttype>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/test.txt');
      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('test.txt');
      expect(results[0].basename).toBe('test.txt');
      expect(results[0].lastmod).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
      expect(results[0].size).toBe(1234);
      expect(results[0].type).toBe('file');
      expect(results[0].etag).toBe('Wed, 15 Jan 2025 10:00:00 GMT'); // Now using lastmod as etag
      expect(results[0].data['content-type']).toBe('text/plain');
    });

    it('should parse multiple files in PROPFIND response', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/file1.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
                <d:getetag>"abc123"</d:getetag>
                <d:getcontentlength>100</d:getcontentlength>
              </d:prop>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/folder/file2.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 11:00:00 GMT</d:getlastmodified>
                <d:getetag>"def456"</d:getetag>
                <d:getcontentlength>200</d:getcontentlength>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/folder/');
      expect(results.length).toBe(2);
      expect(results[0].filename).toBe('file1.txt');
      expect(results[0].etag).toBe('Wed, 15 Jan 2025 10:00:00 GMT'); // Now using lastmod as etag
      expect(results[1].filename).toBe('file2.txt');
      expect(results[1].etag).toBe('Wed, 15 Jan 2025 11:00:00 GMT'); // Now using lastmod as etag
    });

    it('should handle encoded URLs', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/file%20with%20spaces.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
                <d:getetag>"abc123"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/folder/');
      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('file with spaces.txt');
    });

    it('should skip directory itself in directory listing', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/folder/file.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/folder/');
      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('file.txt');
    });

    it('should NOT skip file when querying specific file path', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/__meta_</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
                <d:getetag>"meta123"</d:getetag>
                <d:getcontentlength>500</d:getcontentlength>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/__meta_');
      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('__meta_');
      expect(results[0].etag).toBe('Wed, 15 Jan 2025 10:00:00 GMT'); // Now using lastmod as etag
    });

    it('should handle invalid XML gracefully', () => {
      const invalidXml = '<invalid>not closed';
      const results = parser.parseMultiplePropsFromXml(invalidXml, '/');
      expect(results).toEqual([]);
    });

    it('should handle empty response', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/');
      expect(results).toEqual([]);
    });

    it('should use lastmod as etag when present', () => {
      const cleanRevFn = jasmine
        .createSpy('cleanRevFn')
        .and.callFake((rev: string) => rev.replace(/"/g, '').toUpperCase());
      const customParser = new WebdavXmlParser(cleanRevFn);

      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"abc123"</d:getetag>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = customParser.parseMultiplePropsFromXml(xml, '/test.txt');
      // cleanRevFn should no longer be called for the etag
      expect(results[0].etag).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
    });

    it('should handle missing properties gracefully', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/test.txt');
      expect(results.length).toBe(1);
      expect(results[0].etag).toBe('Wed, 15 Jan 2025 10:00:00 GMT'); // Falls back to lastmod when no etag
      expect(results[0].size).toBe(0);
      expect(results[0].type).toBe('file');
    });

    it('should identify directories correctly', () => {
      const xml = `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/subfolder/</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
                <d:getlastmodified>Wed, 15 Jan 2025 10:00:00 GMT</d:getlastmodified>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const results = parser.parseMultiplePropsFromXml(xml, '/folder/');
      expect(results.length).toBe(1);
      expect(results[0].type).toBe('directory');
      expect(results[0].filename).toBe(''); // displayname is empty, and href ends with /
    });
  });

  describe('parseXmlResponseElement', () => {
    it('should return null for response without href', () => {
      const doc = new DOMParser().parseFromString(
        '<d:response xmlns:d="DAV:"></d:response>',
        'text/xml',
      );
      const response = doc.querySelector('response')!;
      const result = parser.parseXmlResponseElement(response, '/test');
      expect(result).toBeNull();
    });

    it('should return null for non-200 status', () => {
      const xml = `<d:response xmlns:d="DAV:">
        <d:href>/test.txt</d:href>
        <d:propstat>
          <d:status>HTTP/1.1 404 Not Found</d:status>
        </d:propstat>
      </d:response>`;
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const response = doc.querySelector('response')!;
      const result = parser.parseXmlResponseElement(response, '/test.txt');
      expect(result).toBeNull();
    });
  });
});
