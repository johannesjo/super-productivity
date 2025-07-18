/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import {
  RemoteFileNotFoundAPIError,
  NoEtagAPIError,
  HttpNotOkAPIError,
} from '../../../errors/errors';
import { WebdavPrivateCfg } from './webdav.model';

describe('WebdavApi - Additional Coverage Tests', () => {
  let api: WebdavApi;
  let mockGetCfgOrError: jasmine.Spy;
  let mockFetch: jasmine.Spy;
  let originalFetch: typeof fetch;

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
    const responseBody = [204, 304].includes(status) ? null : body;
    const response = new Response(responseBody, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers(headers),
    });
    return response;
  };

  beforeEach(() => {
    originalFetch = window.fetch;
    mockGetCfgOrError = jasmine
      .createSpy('getCfgOrError')
      .and.returnValue(Promise.resolve(mockCfg));
    api = new WebdavApi(mockGetCfgOrError);

    mockFetch = jasmine.createSpy('fetch');
    window.fetch = mockFetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  describe('Additional Download Coverage', () => {
    it('should generate hash when etag is missing and PROPFIND fails with non-404 error', async () => {
      const mockResponse = createMockResponse(200, {}, 'file content');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // Mock getFileMeta to fail with a non-404 error
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      // Mock crypto API using spyOnProperty for read-only properties
      const mockHashBuffer = new ArrayBuffer(32);
      // Fill the buffer with non-zero values to get a proper hex hash
      const view = new Uint8Array(mockHashBuffer);
      for (let i = 0; i < view.length; i++) {
        view[i] = i % 256;
      }
      const mockCrypto = {
        subtle: {
          digest: jasmine.createSpy('digest').and.callFake(() => {
            return Promise.resolve(mockHashBuffer);
          }),
        },
        getRandomValues: jasmine.createSpy('getRandomValues'),
        randomUUID: jasmine.createSpy('randomUUID'),
      } as unknown as Crypto;

      // Use spyOnProperty for read-only crypto property
      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(mockCrypto);

      try {
        const result = await api.download({ path: 'test.txt' });

        expect(result.rev).toMatch(/^[a-f0-9]{16}$/); // First 16 chars of SHA-256 hash
        expect(result.dataStr).toBe('file content');
        expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
          'SHA-256',
          jasmine.any(Uint8Array),
        );
      } finally {
        // Restore is automatic with spyOnProperty
      }
    });

    it('should throw error when hash generation fails', async () => {
      const mockResponse = createMockResponse(200, {}, 'file content');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      // Mock crypto to throw error using spyOnProperty
      const mockCrypto = {
        subtle: {
          digest: jasmine.createSpy('digest').and.callFake(() => {
            return Promise.reject(new Error('Crypto error'));
          }),
        },
        getRandomValues: jasmine.createSpy('getRandomValues'),
        randomUUID: jasmine.createSpy('randomUUID'),
      } as unknown as Crypto;

      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(mockCrypto);

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(NoEtagAPIError),
      );
    });

    it('should throw error when crypto API is not available', async () => {
      const mockResponse = createMockResponse(200, {}, 'file content');
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.reject(new Error('Network error')),
      );

      // Mock crypto as undefined using spyOnProperty
      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(undefined as any);

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(NoEtagAPIError),
      );
    });
  });

  describe('Additional Remove Coverage', () => {
    it('should include If-Match header when expectedEtag is provided', async () => {
      // Mock getFileMeta to return file metadata
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: '2023-01-01',
          size: 100,
          type: 'file',
          etag: 'current-etag',
          data: {},
        }),
      );

      // Mock DELETE request
      const deleteResponse = createMockResponse(204);
      mockFetch.and.returnValue(Promise.resolve(deleteResponse));

      await api.remove('test.txt', 'expected-etag-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Check the DELETE call
      const deleteCall = mockFetch.calls.mostRecent();
      expect(deleteCall.args[0]).toBe('https://webdav.example.com/test.txt');
      expect(deleteCall.args[1].method).toBe('DELETE');
      expect(deleteCall.args[1].headers.get('If-Match')).toBe('expected-etag-123');
    });

    it('should add Depth header for directory deletion', async () => {
      // Mock getFileMeta to return directory type
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'folder',
          basename: 'folder',
          lastmod: '2023-01-01',
          size: 0,
          type: 'directory',
          etag: 'dir-etag',
          data: {},
        }),
      );

      const mockResponse = createMockResponse(204);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.remove('folder/');

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Depth')).toBe('infinity');
    });

    it('should handle invalid XML in multi-status response', async () => {
      // Mock getFileMeta to return directory type
      spyOn(api, 'getFileMeta').and.returnValue(
        Promise.resolve({
          filename: 'folder',
          basename: 'folder',
          lastmod: '2023-01-01',
          size: 0,
          type: 'directory',
          etag: 'dir-etag',
          data: {},
        }),
      );

      const invalidXml = 'not valid xml <<<<';
      const mockResponse = createMockResponse(207, {}, invalidXml);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      // Should not throw - assumes success when XML parsing fails
      await expectAsync(api.remove('folder/')).toBeResolved();
    });
  });

  describe('Additional GetFileMeta Coverage', () => {
    xit('should use GET fallback when useGetFallback is true', async () => {
      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'PROPFIND' && callCount === 1) {
          // First PROPFIND fails
          return Promise.resolve(createMockResponse(500));
        } else if (method === 'HEAD' && callCount === 2) {
          // Then HEAD fails
          return Promise.resolve(createMockResponse(500));
        } else if (method === 'GET' && callCount === 3) {
          // GET request succeeds
          return Promise.resolve(
            createMockResponse(200, { etag: '"get-etag"' }, 'content'),
          );
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      const result = await api.getFileMeta('test.txt', null, true);

      expect(result.etag).toBe('get-etag');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw when GET fallback also fails', async () => {
      const error = new HttpNotOkAPIError(new Response(null, { status: 500 }));
      mockFetch.and.returnValue(Promise.reject(error));

      await expectAsync(api.getFileMeta('test.txt', null, true)).toBeRejectedWith(
        jasmine.any(HttpNotOkAPIError),
      );
    });
  });

  describe('Additional CheckFolderExists Coverage', () => {
    it('should return false when getFileMeta throws 405 error', async () => {
      // HEAD request fails
      const headError = new Error('Method not allowed');
      (headError as any).status = 405;

      // getFileMeta (PROPFIND) also fails with 405
      const propfindError = new Error('Method not allowed');
      (propfindError as any).status = 405;

      let callCount = 0;
      mockFetch.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(headError);
        }
        return Promise.reject(propfindError);
      });

      const result = await api.checkFolderExists('folder/');

      expect(result).toBe(false);
    });
  });

  describe('Additional CreateFolder Coverage', () => {
    it('should handle MKCOL error with specific error messages', async () => {
      const mkcolError = new Error('Expected one of PUT, GET');
      (mkcolError as any).status = 405;

      // First MKCOL fails with specific error message
      // Then PUT succeeds
      let callCount = 0;
      mockFetch.and.callFake((url: string, options: any) => {
        callCount++;
        if (callCount === 1 && options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        return Promise.resolve(createMockResponse(201));
      });

      await api.createFolder({ folderPath: 'newfolder' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Second call should be PUT
      const secondCall = mockFetch.calls.argsFor(1);
      expect(secondCall[1].method).toBe('PUT');
    });

    it('should handle MKCOL error message in response', async () => {
      const mkcolError = new Error('MKCOL is not supported');
      (mkcolError as any).status = 405;

      let callCount = 0;
      mockFetch.and.callFake((url: string, options: any) => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(mkcolError);
        }
        return Promise.resolve(createMockResponse(201));
      });

      await api.createFolder({ folderPath: 'newfolder' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/newfolder/.folder',
        jasmine.objectContaining({ method: 'PUT' }),
      );
    });
  });

  describe('Additional Upload Coverage', () => {
    it('should throw NoEtagAPIError when retry after 404 fails with NoEtagAPIError', async () => {
      // First attempt fails with 404
      const firstResponse = createMockResponse(404);

      mockFetch.and.returnValue(Promise.resolve(firstResponse));

      // Mock _ensureParentDirectoryExists to succeed
      spyOn(api as any, '_ensureParentDirectoryExists').and.returnValue(
        Promise.resolve(),
      );

      // Mock the retry to throw NoEtagAPIError
      spyOn(api as any, '_makeRequest').and.callFake((options: any) => {
        if (options.body === 'test data') {
          // First call
          (api as any)._makeRequest.and.returnValue(
            Promise.reject(new NoEtagAPIError({ path: 'folder/test.txt' })),
          );
          return Promise.resolve(firstResponse);
        }
        // Retry call
        return Promise.reject(new NoEtagAPIError({ path: 'folder/test.txt' }));
      });

      await expectAsync(
        api.upload({
          data: 'test data',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });
  });

  describe('Additional EnsureParentDirectoryExists Coverage', () => {
    it('should handle 404 error during parent directory creation', async () => {
      const error404 = new RemoteFileNotFoundAPIError('/a');

      spyOn(api, 'checkFolderExists').and.returnValue(Promise.resolve(false));
      spyOn(api, 'createFolder').and.returnValue(Promise.reject(error404));

      // Should not throw - continues despite error
      await expectAsync(
        (api as any)._ensureParentDirectoryExists('a/b/c/file.txt'),
      ).toBeResolved();

      expect(api.createFolder).toHaveBeenCalled();
    });

    it('should handle generic 404 status error during parent directory creation', async () => {
      const error = new Error('Not found');
      (error as any).status = 404;

      spyOn(api, 'checkFolderExists').and.returnValue(Promise.resolve(false));
      spyOn(api, 'createFolder').and.returnValue(Promise.reject(error));

      // Should not throw - continues despite error
      await expectAsync(
        (api as any)._ensureParentDirectoryExists('a/b/c/file.txt'),
      ).toBeResolved();
    });
  });
});
