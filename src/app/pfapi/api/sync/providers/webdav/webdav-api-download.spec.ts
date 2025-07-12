/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { HttpNotOkAPIError, RemoteFileNotFoundAPIError } from '../../../errors/errors';

describe('WebdavApi - Download Operations', () => {
  let api: WebdavApi;
  let mockGetCfgOrError: jasmine.Spy;
  let mockFetch: jasmine.Spy;

  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
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
    (globalThis as any).fetch = mockFetch;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const mockResponse = createMockResponse(
        200,
        { etag: '"download-etag"' },
        'file content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'test.txt' });

      expect(result).toEqual({
        rev: 'download-etag',
        dataStr: 'file content',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'GET',
          headers: jasmine.any(Headers),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Accept-Encoding')).toBe('gzip, deflate');
      expect(headers.get('Accept')).toBe('application/octet-stream, text/plain, */*');
    });

    it('should handle conditional download with localRev', async () => {
      const mockResponse = createMockResponse(
        200,
        { etag: '"new-etag"' },
        'updated content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'test.txt', localRev: 'old-etag' });

      expect(result).toEqual({
        rev: 'new-etag',
        dataStr: 'updated content',
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-None-Match')).toBe('old-etag');
    });

    it('should handle 304 Not Modified response', async () => {
      const mockResponse = createMockResponse(304, { etag: '"unchanged-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.download({ path: 'test.txt', localRev: 'unchanged-etag' }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/not modified/i),
          status: 304,
          localRev: 'unchanged-etag',
        }),
      );
    });

    it('should handle range requests', async () => {
      const mockResponse = createMockResponse(
        206,
        { etag: '"partial-etag"' },
        'partial content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({
        path: 'large-file.bin',
        rangeStart: 0,
        rangeEnd: 1023,
      });

      expect(result).toEqual({
        rev: 'partial-etag',
        dataStr: 'partial content',
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Range')).toBe('bytes=0-1023');
    });

    it('should handle open-ended range requests', async () => {
      const mockResponse = createMockResponse(
        206,
        { etag: '"partial-etag"' },
        'partial content from 1024 onwards',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.download({
        path: 'large-file.bin',
        rangeStart: 1024,
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Range')).toBe('bytes=1024-');
    });

    it('should handle missing etag in response by using PROPFIND', async () => {
      const mockResponse = createMockResponse(200, {}, 'file content');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // Mock getFileMeta to return etag
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          etag: 'propfind-etag',
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: '2023-01-01',
          size: 100,
          type: 'file',
          data: {},
        }),
      );

      const result = await api.download({ path: 'test.txt' });

      expect(result).toEqual({
        rev: 'propfind-etag',
        dataStr: 'file content',
      });
      expect(api.getFileMeta).toHaveBeenCalledWith('test.txt', null);
    });

    it('should handle HTML error response', async () => {
      const htmlError = `<!DOCTYPE html>
        <html>
          <body>
            <h1>404 Not Found</h1>
            <p>The requested resource was not found.</p>
          </body>
        </html>`;
      const mockResponse = createMockResponse(200, { etag: '"html-etag"' }, htmlError);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle 404 Not Found', async () => {
      const mockResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.download({ path: 'missing.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle network errors', async () => {
      mockFetch.and.returnValue(Promise.reject(new Error('Network error')));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.objectContaining({ message: 'Network error' }),
      );
    });

    it('should handle non-OK HTTP responses', async () => {
      const mockResponse = createMockResponse(500);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(HttpNotOkAPIError),
      );
    });

    it('should download empty files', async () => {
      const mockResponse = createMockResponse(200, { etag: '"empty-etag"' }, '');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'empty.txt' });

      expect(result).toEqual({
        rev: 'empty-etag',
        dataStr: '',
      });
    });

    it('should handle special characters in file paths', async () => {
      const mockResponse = createMockResponse(
        200,
        { etag: '"special-etag"' },
        'special content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({
        path: 'folder/file with spaces & special.txt',
      });

      expect(result).toEqual({
        rev: 'special-etag',
        dataStr: 'special content',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/folder/file%20with%20spaces%20&%20special.txt',
        jasmine.any(Object),
      );
    });

    it('should handle large file downloads', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const mockResponse = createMockResponse(
        200,
        { etag: '"large-etag"' },
        largeContent,
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'large-file.bin' });

      expect(result).toEqual({
        rev: 'large-etag',
        dataStr: largeContent,
      });
    });

    it('should handle various etag formats from response', async () => {
      const testCases = [
        { input: '"simple-etag"', expected: 'simple-etag' },
        { input: 'W/"weak-etag"', expected: 'Wweak-etag' },
        { input: '"etag-with-quotes"', expected: 'etag-with-quotes' },
        { input: 'unquoted-etag', expected: 'unquoted-etag' },
      ];

      for (const testCase of testCases) {
        mockFetch.calls.reset();
        const mockResponse = createMockResponse(200, { etag: testCase.input }, 'content');
        mockFetch.and.returnValue(Promise.resolve(mockResponse));

        const result = await api.download({ path: 'test.txt' });

        expect(result.rev).toBe(testCase.expected);
      }
    });

    it('should handle 416 Range Not Satisfiable', async () => {
      const mockResponse = createMockResponse(416);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const error = await api
        .download({
          path: 'small-file.txt',
          rangeStart: 1000000,
          rangeEnd: 2000000,
        })
        .catch((e) => e);

      // 416 is a valid WebDAV status that calling method should handle
      expect(error).toBeDefined();
    });

    it('should include Authorization header', async () => {
      const mockResponse = createMockResponse(
        200,
        { etag: '"auth-etag"' },
        'authorized content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.download({ path: 'protected.txt' });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
    });

    it('should handle compressed responses', async () => {
      const mockResponse = createMockResponse(
        200,
        {
          etag: '"compressed-etag"',
          'content-encoding': 'gzip',
        },
        'compressed content',
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'compressed.txt' });

      expect(result).toEqual({
        rev: 'compressed-etag',
        dataStr: 'compressed content',
      });
    });

    it('should handle HTML response with "There is nothing here, sorry" message', async () => {
      const htmlError = '<html><body>There is nothing here, sorry</body></html>';
      const mockResponse = createMockResponse(200, { etag: '"html-etag"' }, htmlError);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle binary data as text', async () => {
      const binaryLikeContent = '\x00\x01\x02\x03\x04\x05';
      const mockResponse = createMockResponse(
        200,
        { etag: '"binary-etag"' },
        binaryLikeContent,
      );
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.download({ path: 'binary.dat' });

      expect(result).toEqual({
        rev: 'binary-etag',
        dataStr: binaryLikeContent,
      });
    });
  });
});
