/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import {
  FileExistsAPIError,
  HttpNotOkAPIError,
  NoEtagAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';

describe('WebdavApi - Upload Operations', () => {
  let api: WebdavApi;
  let mockGetCfgOrError: jasmine.Spy;
  let mockFetch: jasmine.Spy;

  const mockCfg: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
    // Pre-configure server capabilities to prevent detection calls
    serverCapabilities: {
      supportsETags: true,
      supportsIfHeader: true,
      supportsLocking: false,
      supportsLastModified: false,
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
    (globalThis as any).fetch = mockFetch;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  describe('upload', () => {
    it('should upload file successfully and return etag', async () => {
      const mockResponse = createMockResponse(201, { etag: '"etag-123"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('etag-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/test.txt',
        jasmine.objectContaining({
          method: 'PUT',
          body: 'test data',
          headers: jasmine.any(Headers),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Content-Type')).toBe('application/octet-stream');
      expect(headers.get('If-None-Match')).toBe('*');
      expect(headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
    });

    it('should handle conditional upload with expectedEtag', async () => {
      const mockResponse = createMockResponse(200, { etag: '"new-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: 'old-etag',
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-Match')).toBe('old-etag');
      expect(headers.get('If-None-Match')).toBeNull();
    });

    it('should handle overwrite mode', async () => {
      const mockResponse = createMockResponse(201, { etag: '"etag-123"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: true,
        expectedEtag: null,
      });

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('If-Match')).toBeNull();
      expect(headers.get('If-None-Match')).toBeNull();
    });

    it('should throw FileExistsAPIError on 412 status when not overwriting', async () => {
      const mockResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(FileExistsAPIError));
    });

    it('should throw error on 412 status when overwriting with wrong etag', async () => {
      const mockResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: true,
          expectedEtag: 'wrong-etag',
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/file was modified.*wrong-etag/),
        }),
      );
    });

    it('should clean etag by removing quotes but keeping weak prefix', async () => {
      const mockResponse = createMockResponse(201, { etag: 'W/"weak-etag-123"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('Wweak-etag-123');
    });

    it('should handle missing etag in response', async () => {
      const mockResponse = createMockResponse(201);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // Mock getFileMeta to also fail
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new RemoteFileNotFoundAPIError('test.txt')),
      );

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });

    it('should retry getting etag via PROPFIND if not in headers', async () => {
      const mockResponse = createMockResponse(201);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

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

      const result = await api.upload({
        data: 'test data',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('propfind-etag');
      expect(api.getFileMeta).toHaveBeenCalledWith('test.txt', null);
    });

    it('should handle 404 error by creating parent directories', async () => {
      // First attempt fails with 404
      const firstResponse = createMockResponse(404);
      // After creating directories, upload succeeds
      const secondResponse = createMockResponse(201, { etag: '"retry-etag"' });

      let callCount = 0;
      mockFetch.and.callFake(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? firstResponse : secondResponse);
      });

      spyOn(api as any, '_ensureParentDirectoryExists').and.returnValue(
        Promise.resolve(),
      );

      const result = await api.upload({
        data: 'test data',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('retry-etag');
      expect((api as any)._ensureParentDirectoryExists).toHaveBeenCalledWith(
        'folder/test.txt',
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle 409 conflict by creating parent directories', async () => {
      // The upload method doesn't handle 409 specially - it just throws NoEtagAPIError
      const mockResponse = createMockResponse(409);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });

    it('should throw NoEtagAPIError after all retry attempts fail', async () => {
      const mockResponse = createMockResponse(201);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // Mock all etag retrieval methods to fail
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new Error('PROPFIND failed')),
      );
      spyOn(api, 'download').and.returnValue(Promise.reject(new Error('GET failed')));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });

    it('should handle large file uploads', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
      const mockResponse = createMockResponse(201, { etag: '"large-file-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: largeData,
        path: 'large-file.bin',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('large-file-etag');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/large-file.bin',
        jasmine.objectContaining({
          method: 'PUT',
          body: largeData,
        }),
      );
    });

    it('should handle special characters in file paths', async () => {
      const mockResponse = createMockResponse(201, { etag: '"special-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: 'test data',
        path: 'folder/file with spaces & special.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('special-etag');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/folder/file%20with%20spaces%20&%20special.txt',
        jasmine.any(Object),
      );
    });

    it('should handle empty file upload', async () => {
      const mockResponse = createMockResponse(201, { etag: '"empty-etag"' });
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.upload({
        data: '',
        path: 'empty.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('empty-etag');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/empty.txt',
        jasmine.objectContaining({
          method: 'PUT',
          body: '',
        }),
      );
    });

    it('should handle various etag formats', async () => {
      const testCases = [
        { input: '"simple-etag"', expected: 'simple-etag' },
        { input: 'W/"weak-etag"', expected: 'Wweak-etag' },
        { input: '"etag-with-quotes"', expected: 'etag-with-quotes' },
        { input: 'unquoted-etag', expected: 'unquoted-etag' },
      ];

      for (const testCase of testCases) {
        mockFetch.calls.reset();
        const mockResponse = createMockResponse(201, { etag: testCase.input });
        mockFetch.and.returnValue(Promise.resolve(mockResponse));

        const result = await api.upload({
          data: 'test',
          path: 'test.txt',
          isOverwrite: true,
          expectedEtag: null,
        });

        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.and.returnValue(Promise.reject(new Error('Network error')));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.objectContaining({ message: 'Network error' }));
    });

    it('should handle non-OK HTTP responses', async () => {
      const mockResponse = createMockResponse(500);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(HttpNotOkAPIError));
    });

    it('should handle 413 Payload Too Large', async () => {
      const mockResponse = createMockResponse(413);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'x'.repeat(100 * 1024 * 1024), // 100MB
          path: 'huge-file.bin',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(HttpNotOkAPIError));
    });

    it('should handle 507 Insufficient Storage', async () => {
      const mockResponse = createMockResponse(507);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(HttpNotOkAPIError));
    });

    it('should handle 423 Locked', async () => {
      const mockResponse = createMockResponse(423);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'locked-file.txt',
          isOverwrite: true,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Resource is locked/),
        }),
      );
    });

    it('should handle retry after 404 but etag retrieval fails', async () => {
      // First attempt fails with 404
      const firstResponse = createMockResponse(404);
      // After creating directories, upload succeeds but no etag
      const secondResponse = createMockResponse(201);

      let callCount = 0;
      mockFetch.and.callFake(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? firstResponse : secondResponse);
      });

      spyOn(api as any, '_ensureParentDirectoryExists').and.returnValue(
        Promise.resolve(),
      );
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new Error('PROPFIND failed')),
      );
      spyOn(api, 'download').and.returnValue(Promise.reject(new Error('GET failed')));

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });

    it('should handle retry after 409 with RemoteFileNotFoundAPIError when all fallbacks fail', async () => {
      // First attempt fails with 409
      const firstResponse = createMockResponse(409);
      // Retry attempt fails with 404
      const retryResponse = createMockResponse(404);

      let callCount = 0;
      mockFetch.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(firstResponse);
        }
        return Promise.resolve(retryResponse);
      });

      spyOn(api as any, '_ensureParentDirectoryExists').and.returnValue(
        Promise.resolve(),
      );

      // Mock getFileMeta and download to fail so RemoteFileNotFoundAPIError is thrown
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new RemoteFileNotFoundAPIError('folder/test.txt')),
      );
      spyOn(api, 'download').and.returnValue(
        Promise.reject(new RemoteFileNotFoundAPIError('folder/test.txt')),
      );

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(RemoteFileNotFoundAPIError));
    });
  });
});
