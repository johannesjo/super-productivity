/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { RemoteFileNotFoundAPIError, NoEtagAPIError } from '../../../errors/errors';
import { WebdavPrivateCfg } from './webdav.model';

describe('WebdavApi - Metadata Operations', () => {
  let api: WebdavApi;
  let mockGetCfgOrError: jasmine.Spy;
  let mockFetch: jasmine.Spy;

  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
    serverCapabilities: {
      supportsETags: true,
      supportsIfHeader: true,
      supportsLocking: false,
      supportsLastModified: true,
    },
  };

  const createMockResponse = (
    status: number,
    headers: Record<string, string> = {},
    body: string = '',
  ): Response => {
    // 204 No Content and 304 Not Modified responses can't have a body
    const responseBody = [204, 304].includes(status) ? null : body;
    const response = new Response(responseBody, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers(headers),
    });
    return response;
  };

  beforeEach(() => {
    mockGetCfgOrError = jasmine
      .createSpy('getCfgOrError')
      .and.returnValue(Promise.resolve(mockCfg));
    api = new WebdavApi(mockGetCfgOrError);

    mockFetch = jasmine.createSpy('fetch');
    window.fetch = mockFetch;
  });

  afterEach(() => {
    delete (window as any).fetch;
  });

  describe('getFileMeta', () => {
    const propfindResponse = `<?xml version="1.0" encoding="utf-8"?>
      <d:multistatus xmlns:d="DAV:">
        <d:response>
          <d:href>/test.txt</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>test.txt</d:displayname>
              <d:getcontentlength>1234</d:getcontentlength>
              <d:getlastmodified>Mon, 01 Jan 2023 00:00:00 GMT</d:getlastmodified>
              <d:getetag>"etag-123"</d:getetag>
              <d:resourcetype/>
              <d:getcontenttype>text/plain</d:getcontenttype>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
      </d:multistatus>`;

    it('should get file metadata successfully', async () => {
      const mockResponse = createMockResponse(207, {}, propfindResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result).toEqual(
        jasmine.objectContaining({
          filename: 'test.txt',
          basename: 'test.txt',
          size: 1234,
          type: 'file',
          etag: 'etag-123',
        }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'PROPFIND',
          headers: jasmine.any(Headers),
          body: jasmine.stringContaining('<?xml'),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Depth')).toBe('0');
      expect(headers.get('Content-Type')).toBe('application/xml');
    });

    it('should handle conditional request with localRev', async () => {
      const mockResponse = createMockResponse(207, {}, propfindResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.getFileMeta('test.txt', 'old-etag');

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-None-Match')).toBe('old-etag');
    });

    it('should handle 304 Not Modified response', async () => {
      const mockResponse = createMockResponse(304);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // 304 responses are treated as RemoteFileNotFoundAPIError in the current implementation
      await expectAsync(api.getFileMeta('test.txt', 'current-etag')).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle folder metadata', async () => {
      const folderResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/folder/</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>folder</d:displayname>
                <d:getlastmodified>Mon, 01 Jan 2023 00:00:00 GMT</d:getlastmodified>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, folderResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.getFileMeta('folder/', null);

      expect(result.type).toBe('directory');
      expect(result.basename).toBe('folder');
    });

    it('should handle 404 Not Found', async () => {
      const mockResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.getFileMeta('missing.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle HTML error response', async () => {
      const htmlError = '<!DOCTYPE html><html><body>Error</body></html>';
      const mockResponse = createMockResponse(207, {}, htmlError);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // When HTML is returned instead of XML, it's treated as file not found
      await expectAsync(api.getFileMeta('test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should parse various WebDAV property formats', async () => {
      const customResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>test.txt</d:displayname>
                <d:getcontentlength>5678</d:getcontentlength>
                <d:getlastmodified>Wed, 15 Mar 2023 10:30:00 GMT</d:getlastmodified>
                <d:getetag>"oc-etag-456"</d:getetag>
                <d:resourcetype/>
                <d:getcontenttype>application/pdf</d:getcontenttype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, customResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result.size).toBe(5678);
      expect(result.etag).toBe('oc-etag-456');
      expect(result.data['content-type']).toBe('application/pdf');
    });

    it('should handle missing properties gracefully', async () => {
      const minimalResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>test.txt</d:displayname>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, minimalResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result.filename).toBe('test.txt');
      expect(result.size).toBe(0);
      expect(result.etag).toBe('');
      // Empty resourcetype should default to 'file'
      expect(result.type).toBe('file');
    });

    it('should handle multiple response elements', async () => {
      const multiResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/other.txt</d:href>
            <d:propstat>
              <d:prop><d:displayname>other.txt</d:displayname></d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>test.txt</d:displayname>
                <d:getetag>"correct-etag"</d:getetag>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, multiResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.getFileMeta('test.txt', null);

      expect(result.etag).toBe('correct-etag');
    });
  });

  describe('listFolder', () => {
    const listResponse = `<?xml version="1.0" encoding="utf-8"?>
      <d:multistatus xmlns:d="DAV:">
        <d:response>
          <d:href>/folder/</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>folder</d:displayname>
              <d:resourcetype><d:collection/></d:resourcetype>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
        <d:response>
          <d:href>/folder/file1.txt</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>file1.txt</d:displayname>
              <d:getcontentlength>100</d:getcontentlength>
              <d:getetag>"file1-etag"</d:getetag>
              <d:resourcetype/>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
        <d:response>
          <d:href>/folder/file2.txt</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>file2.txt</d:displayname>
              <d:getcontentlength>200</d:getcontentlength>
              <d:getetag>"file2-etag"</d:getetag>
              <d:resourcetype/>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
        <d:response>
          <d:href>/folder/subfolder/</d:href>
          <d:propstat>
            <d:prop>
              <d:displayname>subfolder</d:displayname>
              <d:resourcetype><d:collection/></d:resourcetype>
            </d:prop>
            <d:status>HTTP/1.1 200 OK</d:status>
          </d:propstat>
        </d:response>
      </d:multistatus>`;

    it('should list folder contents excluding the folder itself', async () => {
      const mockResponse = createMockResponse(207, {}, listResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.listFolder('/folder/');

      expect(result.length).toBe(3);
      expect(result[0].basename).toBe('file1.txt');
      expect(result[1].basename).toBe('file2.txt');
      expect(result[2].basename).toBe('subfolder');
      expect(result[2].type).toBe('directory');
    });

    it('should normalize folder paths', async () => {
      const mockResponse = createMockResponse(207, {}, listResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.listFolder('folder');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/folder',
        jasmine.objectContaining({
          method: 'PROPFIND',
          headers: jasmine.any(Headers),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Depth')).toBe('1');
    });

    it('should handle empty folders', async () => {
      const emptyResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/empty-folder/</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>empty-folder</d:displayname>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, emptyResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.listFolder('/empty-folder/');

      expect(result).toEqual([]);
    });

    it('should handle 404 Not Found', async () => {
      const mockResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.listFolder('/missing-folder/')).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle folders with special characters', async () => {
      const specialResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/special%20folder/</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>special folder</d:displayname>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/special%20folder/file%20with%20spaces.txt</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>file with spaces.txt</d:displayname>
                <d:getcontentlength>100</d:getcontentlength>
                <d:resourcetype/>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, specialResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.listFolder('/special folder/');

      expect(result.length).toBe(1);
      expect(result[0].basename).toBe('file with spaces.txt');
    });

    it('should handle PROPFIND not supported error', async () => {
      mockFetch.and.returnValue(Promise.reject(new Error('Method PROPFIND not allowed')));

      const result = await api.listFolder('/folder/');

      expect(result).toEqual([]);
    });

    it('should propagate other errors', async () => {
      mockFetch.and.returnValue(Promise.reject(new Error('Network error')));

      await expectAsync(api.listFolder('/folder/')).toBeRejectedWith(
        jasmine.objectContaining({ message: 'Network error' }),
      );
    });

    it('should parse files with various properties', async () => {
      const detailedResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
          <d:response>
            <d:href>/folder/</d:href>
            <d:propstat>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/folder/document.pdf</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>document.pdf</d:displayname>
                <d:getcontentlength>524288</d:getcontentlength>
                <d:getlastmodified>Thu, 15 Jun 2023 14:30:00 GMT</d:getlastmodified>
                <d:getetag>"pdf-etag-789"</d:getetag>
                <d:getcontenttype>application/pdf</d:getcontenttype>
                <d:resourcetype/>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, detailedResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.listFolder('/folder/');

      expect(result.length).toBe(1);
      expect(result[0]).toEqual(
        jasmine.objectContaining({
          basename: 'document.pdf',
          size: 524288,
          etag: 'pdf-etag-789',
          type: 'file',
          data: jasmine.objectContaining({
            'content-type': 'application/pdf',
          }),
        }),
      );
    });

    it('should handle root folder listing', async () => {
      const rootResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/</d:href>
            <d:propstat>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
          <d:response>
            <d:href>/root-file.txt</d:href>
            <d:propstat>
              <d:prop>
                <d:displayname>root-file.txt</d:displayname>
                <d:resourcetype/>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, rootResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.listFolder('/');

      expect(result.length).toBe(1);
      expect(result[0].basename).toBe('root-file.txt');
    });
  });

  describe('getRevFromMetaHelper', () => {
    it('should get etag from metadata object with data property', () => {
      const metadata = {
        data: {
          etag: '"meta-etag"',
        },
      };

      const result = (api as any).getRevFromMetaHelper(metadata);

      expect(result).toBe('meta-etag');
    });

    it('should get etag from direct metadata object', () => {
      const metadata = {
        etag: '"direct-etag"',
      };

      const result = (api as any).getRevFromMetaHelper(metadata);

      expect(result).toBe('direct-etag');
    });

    it('should throw NoEtagAPIError when no etag found', () => {
      const metadata = {
        data: {
          someOtherField: 'value',
        },
      };

      expect(() => (api as any).getRevFromMetaHelper(metadata)).toThrow(
        jasmine.any(NoEtagAPIError),
      );
    });
  });
});
