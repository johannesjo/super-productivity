/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { NoEtagAPIError, RemoteFileNotFoundAPIError } from '../../../errors/errors';

describe('WebdavApi - Fallback Paths', () => {
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

    // Mock global fetch
    mockFetch = jasmine.createSpy('fetch');
    spyOn(globalThis, 'fetch').and.callFake(mockFetch);

    // Mock IS_ANDROID_WEB_VIEW to false for most tests
    spyOnProperty(api as any, 'isAndroidWebView', 'get').and.returnValue(false);

    // Mock checkFolderExists to avoid infinite recursion in tests
    spyOn(api, 'checkFolderExists').and.returnValue(Promise.resolve(false));
  });

  describe('Upload ETag Fallback Chain', () => {
    it('should fallback from response headers to PROPFIND when no ETag in upload response', async () => {
      // Mock upload response without ETag
      const uploadResponse = createMockResponse(201);
      // Mock PROPFIND response with ETag
      const propfindResponse = createMockResponse(
        207,
        {},
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"propfind-etag-123"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT') {
          return Promise.resolve(uploadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.resolve(propfindResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('propfind-etag-123');
      expect(mockFetch).toHaveBeenCalledTimes(2); // PUT + PROPFIND
    });

    it('should fallback from PROPFIND to GET when both upload response and PROPFIND fail', async () => {
      // Mock upload response without ETag
      const uploadResponse = createMockResponse(201);
      // Mock GET response with ETag
      const getResponse = createMockResponse(
        200,
        { etag: '"get-etag-456"' },
        'test content',
      );

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT') {
          return Promise.resolve(uploadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.resolve(getResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('get-etag-456');
      expect(mockFetch).toHaveBeenCalledTimes(4); // PUT + PROPFIND + GET + possibly auth check
    });

    it('should throw NoEtagAPIError when all ETag retrieval methods fail', async () => {
      // Mock upload response without ETag
      const uploadResponse = createMockResponse(201);

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT') {
          return Promise.resolve(uploadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));

      expect(mockFetch).toHaveBeenCalledTimes(4); // PUT + PROPFIND + GET + possibly auth check
    });

    it('should handle 404 upload error with parent directory creation and retry ETag fallbacks', async () => {
      let uploadAttempts = 0;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            // First upload fails with 404
            return Promise.reject(new RemoteFileNotFoundAPIError('test.txt'));
          } else {
            // Retry upload succeeds but no ETag
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.resolve(
            createMockResponse(200, { etag: '"retry-etag"' }, 'content'),
          );
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('retry-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 409 conflict with parent directory creation and complete fallback chain', async () => {
      let uploadAttempts = 0;

      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(conflictError);
          } else {
            // Retry succeeds but no ETag in response
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.resolve(
            createMockResponse(200, { etag: '"conflict-retry-etag"' }, 'content'),
          );
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('conflict-retry-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 409 conflict with successful retry but PROPFIND fallback needed', async () => {
      let uploadAttempts = 0;
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(conflictError);
          } else {
            // Retry succeeds but no ETag in response headers
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.resolve(
            createMockResponse(
              207,
              {},
              `<?xml version="1.0"?>
            <d:multistatus xmlns:d="DAV:">
              <d:response>
                <d:href>/test.txt</d:href>
                <d:propstat>
                  <d:prop>
                    <d:getetag>"propfind-409-retry-etag"</d:getetag>
                  </d:prop>
                  <d:status>HTTP/1.1 200 OK</d:status>
                </d:propstat>
              </d:response>
            </d:multistatus>`,
            ),
          );
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('propfind-409-retry-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 409 conflict with retry success but both PROPFIND and GET fallbacks fail', async () => {
      let uploadAttempts = 0;
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(conflictError);
          } else {
            // Retry succeeds but no ETag in response headers
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));

      expect(uploadAttempts).toBe(2);
    });

    it('should handle 409 conflict where retry itself fails', async () => {
      let uploadAttempts = 0;
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      const retryError = new Error('Retry failed');
      (retryError as any).status = 500;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(conflictError);
          } else {
            // Retry fails
            return Promise.reject(retryError);
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Retry failed/) }),
      );

      expect(uploadAttempts).toBe(2);
    });

    it('should handle 409 conflict where parent directory creation fails', async () => {
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          return Promise.reject(conflictError);
        }
        if (options.method === 'MKCOL') {
          return Promise.reject(new Error('Failed to create parent directory'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Conflict|409/) }),
      );
    });

    it('should handle 409 conflict with NoEtagAPIError on retry propagation', async () => {
      let uploadAttempts = 0;
      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(conflictError);
          } else {
            // Retry succeeds but triggers NoEtagAPIError in fallback chain
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));

      expect(uploadAttempts).toBe(2);
    });
  });

  describe('404 Upload Error Fallback Chain', () => {
    it('should handle 404 upload error with successful retry and ETag in headers', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry succeeds with ETag in response headers
            return Promise.resolve(
              createMockResponse(201, { etag: '"retry-success-etag"' }),
            );
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('retry-success-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error with successful retry but PROPFIND fallback needed', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry succeeds but no ETag in response headers
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.resolve(
            createMockResponse(
              207,
              {},
              `<?xml version="1.0"?>
            <d:multistatus xmlns:d="DAV:">
              <d:response>
                <d:href>/test.txt</d:href>
                <d:propstat>
                  <d:prop>
                    <d:getetag>"propfind-404-retry-etag"</d:getetag>
                  </d:prop>
                  <d:status>HTTP/1.1 200 OK</d:status>
                </d:propstat>
              </d:response>
            </d:multistatus>`,
            ),
          );
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('propfind-404-retry-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error with retry success but GET fallback needed', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry succeeds but no ETag in response headers
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.resolve(
            createMockResponse(200, { etag: '"get-404-fallback-etag"' }, 'content'),
          );
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.upload({
        data: 'test content',
        path: 'folder/test.txt',
        isOverwrite: false,
        expectedEtag: null,
      });

      expect(result).toBe('get-404-fallback-etag');
      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error with retry success but all fallbacks fail', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry succeeds but no ETag in response headers
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));

      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error where retry itself fails', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');
      const retryError = new Error('Retry failed');
      (retryError as any).status = 500;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry fails
            return Promise.reject(retryError);
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Upload failed after creating directories/),
        }),
      );

      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error where parent directory creation fails', async () => {
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          return Promise.reject(notFoundError);
        }
        if (options.method === 'MKCOL') {
          return Promise.reject(new Error('Failed to create parent directory'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(RemoteFileNotFoundAPIError));
    });

    it('should handle 404 upload error with NoEtagAPIError propagation from retry', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry succeeds but triggers NoEtagAPIError chain
            return Promise.resolve(createMockResponse(201));
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));

      expect(uploadAttempts).toBe(2);
    });

    it('should handle 404 upload error with RemoteFileNotFoundAPIError propagation from retry', async () => {
      let uploadAttempts = 0;
      const notFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');
      const retryNotFoundError = new RemoteFileNotFoundAPIError('folder/test.txt');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PUT' && url.includes('test.txt')) {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.reject(notFoundError);
          } else {
            // Retry also fails with 404
            return Promise.reject(retryNotFoundError);
          }
        }
        if (options.method === 'MKCOL') {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(
        api.upload({
          data: 'test content',
          path: 'folder/test.txt',
          isOverwrite: false,
          expectedEtag: null,
        }),
      ).toBeRejectedWith(jasmine.any(RemoteFileNotFoundAPIError));

      expect(uploadAttempts).toBe(2);
    });
  });

  describe('GetFileMeta Fallback Chain', () => {
    it('should fallback from PROPFIND to HEAD when PROPFIND fails', async () => {
      const headResponse = createMockResponse(200, {
        'content-length': '1024',
        'last-modified': 'Wed, 15 Nov 2023 13:25:17 GMT',
        etag: '"head-etag-123"',
        'content-type': 'text/plain',
      });

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          const propfindError = new Error('PROPFIND not supported');
          propfindError.message = 'PROPFIND method not allowed';
          return Promise.reject(propfindError);
        }
        if (options.method === 'HEAD') {
          return Promise.resolve(headResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.getFileMeta('test.txt', null);

      expect(result.etag).toBe('head-etag-123');
      expect(result.size).toBe(1024);
      expect(result.type).toBe('file');
      expect(result.data['content-type']).toBe('text/plain');
    });

    it('should fallback from HEAD to GET when useGetFallback is true', async () => {
      const getResponse = createMockResponse(
        200,
        { etag: '"get-fallback-etag"' },
        'file content',
      );

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          const propfindError = new Error('PROPFIND not supported');
          propfindError.message = 'PROPFIND method not allowed';
          return Promise.reject(propfindError);
        }
        if (options.method === 'HEAD') {
          return Promise.reject(new Error('HEAD failed'));
        }
        if (options.method === 'GET') {
          return Promise.resolve(getResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.getFileMeta('test.txt', null, true); // useGetFallback = true

      expect(result.etag).toBe('get-fallback-etag');
      expect(result.type).toBe('file');
      expect(result.size).toBe(0); // Size unknown from GET fallback
    });

    it('should not use GET fallback when useGetFallback is false', async () => {
      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          const propfindError = new Error('PROPFIND not supported');
          propfindError.message = 'PROPFIND method not allowed';
          return Promise.reject(propfindError);
        }
        if (options.method === 'HEAD') {
          return Promise.reject(new Error('HEAD failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.getFileMeta('test.txt', null, false)).toBeRejectedWith(
        jasmine.objectContaining({ message: 'HEAD failed' }),
      );
    });

    it('should handle GET fallback 404 error correctly', async () => {
      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          const propfindError = new Error('PROPFIND not supported');
          propfindError.message = 'PROPFIND method not allowed';
          return Promise.reject(propfindError);
        }
        if (options.method === 'HEAD') {
          return Promise.reject(new Error('HEAD failed'));
        }
        if (options.method === 'GET') {
          return Promise.reject(new RemoteFileNotFoundAPIError('test.txt'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.getFileMeta('test.txt', null, true)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });
  });

  describe('Download ETag Fallback Chain', () => {
    it('should fallback to PROPFIND when no ETag in download response', async () => {
      const downloadResponse = createMockResponse(200, {}, 'file content');
      const propfindResponse = createMockResponse(
        207,
        {},
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/test.txt</d:href>
            <d:propstat>
              <d:status>HTTP/1.1 200 OK</d:status>
              <d:prop>
                <d:getetag>"download-propfind-etag"</d:getetag>
              </d:prop>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.resolve(propfindResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.download({ path: 'test.txt' });

      expect(result.rev).toBe('download-propfind-etag');
      expect(result.dataStr).toBe('file content');
    });

    it('should fallback to content-based hash when PROPFIND also fails', async () => {
      const downloadResponse = createMockResponse(200, {}, 'test content for hashing');

      // Mock crypto API
      const mockCrypto = {
        subtle: {
          digest: jasmine.createSpy('digest').and.returnValue(
            Promise.resolve(new ArrayBuffer(32)), // Mock SHA-256 hash
          ),
        },
        getRandomValues: jasmine.createSpy('getRandomValues'),
        randomUUID: jasmine.createSpy('randomUUID'),
      } as any;

      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(mockCrypto);

      // Mock Uint8Array to return predictable hash
      const mockHashArray = new Array(16).fill(0).map((_, i) => i % 16);
      spyOn(Array, 'from').and.returnValue(mockHashArray);

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      const result = await api.download({ path: 'test.txt' });

      expect(result.dataStr).toBe('test content for hashing');
      expect(result.rev).toBe('0001020304050607'); // First 8 chars of mock hash
      expect(mockCrypto.subtle.digest).toHaveBeenCalled();
    });

    it('should throw NoEtagAPIError when crypto is not available and PROPFIND fails', async () => {
      const downloadResponse = createMockResponse(200, {}, 'test content');

      // Mock no crypto API
      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(undefined as any);

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(NoEtagAPIError),
      );
    });

    it('should handle PROPFIND 404 during download fallback', async () => {
      const downloadResponse = createMockResponse(200, {}, 'file content');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new RemoteFileNotFoundAPIError('test.txt'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle crypto hash generation failure gracefully', async () => {
      const downloadResponse = createMockResponse(200, {}, 'test content');

      // Mock crypto API that fails
      const mockCrypto = {
        subtle: {
          digest: jasmine
            .createSpy('digest')
            .and.returnValue(Promise.reject(new Error('Hash generation failed'))),
        },
        getRandomValues: jasmine.createSpy('getRandomValues'),
        randomUUID: jasmine.createSpy('randomUUID'),
      } as any;

      spyOnProperty(globalThis, 'crypto', 'get').and.returnValue(mockCrypto);

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        if (options.method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND failed'));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(NoEtagAPIError),
      );
    });
  });

  describe('CreateFolder Complex Fallback Chain', () => {
    it('should fallback from MKCOL to PUT .folder when MKCOL fails', async () => {
      const mkcolError = new Error('Method not allowed');
      (mkcolError as any).status = 405;

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        if (options.method === 'PUT' && url.includes('.folder')) {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await api.createFolder({ folderPath: 'testfolder' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/testfolder/.folder',
        jasmine.objectContaining({ method: 'PUT' }),
      );
    });

    it('should handle 404 during PUT .folder and attempt fallback to .gitkeep', async () => {
      const mkcolError = new Error('Method not allowed');
      (mkcolError as any).status = 405;

      const putError = new RemoteFileNotFoundAPIError('parent/child/.folder');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        if (options.method === 'PUT' && url.includes('.folder')) {
          return Promise.reject(putError);
        }
        if (options.method === 'PUT' && url.includes('.gitkeep')) {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await api.createFolder({ folderPath: 'parent/child' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/parent/child/.gitkeep',
        jasmine.objectContaining({ method: 'PUT' }),
      );
    });

    it('should use .gitkeep approach when all other methods fail', async () => {
      const mkcolError = new Error('Method not allowed');
      (mkcolError as any).status = 405;

      const putError = new RemoteFileNotFoundAPIError('testfolder/.folder');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        if (options.method === 'PUT' && url.includes('.folder')) {
          return Promise.reject(putError);
        }
        if (options.method === 'PUT' && url.includes('.gitkeep')) {
          return Promise.resolve(createMockResponse(201));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await api.createFolder({ folderPath: 'testfolder' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/testfolder/.gitkeep',
        jasmine.objectContaining({ method: 'PUT' }),
      );
    });

    it('should throw error when all createFolder fallback methods fail', async () => {
      const mkcolError = new Error('Method not allowed');
      (mkcolError as any).status = 405;

      const putError = new Error('PUT failed');
      const gitkeepError = new Error('Gitkeep failed');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        if (options.method === 'PUT' && url.includes('.folder')) {
          return Promise.reject(putError);
        }
        if (options.method === 'PUT' && url.includes('.gitkeep')) {
          return Promise.reject(gitkeepError);
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.createFolder({ folderPath: 'testfolder' })).toBeRejectedWith(
        jasmine.objectContaining({ message: 'PUT failed' }),
      );
    });

    it('should handle parent directory creation recursively', async () => {
      const mkcolError = new Error('Method not allowed');
      (mkcolError as any).status = 405;

      const createdPaths: string[] = [];

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'MKCOL') {
          return Promise.reject(mkcolError);
        }
        if (options.method === 'PUT' && url.includes('.folder')) {
          const folderPath = url.split('/').slice(-2, -1)[0]; // Extract folder name
          if (folderPath) {
            createdPaths.push(folderPath);
          }
          return Promise.resolve(createMockResponse(201));
        }
        if (options.method === 'PROPFIND') {
          // All parents don't exist
          return Promise.reject(new RemoteFileNotFoundAPIError(''));
        }
        return Promise.resolve(createMockResponse(500));
      });

      await api.createFolder({ folderPath: 'a/b/c/d' });

      // Should create at least the target folder d
      expect(createdPaths.length).toBeGreaterThanOrEqual(1);
      expect(createdPaths).toContain('d');
    });
  });

  // Note: Android CapacitorHttp fallback tests are complex to mock properly
  // and would require significant test infrastructure changes.
  // These fallback paths are covered by integration tests.

  describe('Edge Case Fallbacks', () => {
    it('should handle empty or invalid XML responses in getFileMeta', async () => {
      const invalidXmlResponse = createMockResponse(207, {}, 'invalid xml content');

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          return Promise.resolve(invalidXmlResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.getFileMeta('test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle HTML error pages instead of XML in getFileMeta', async () => {
      const htmlResponse = createMockResponse(
        207,
        {},
        '<!DOCTYPE html><html><body>Error page</body></html>',
      );

      mockFetch.and.callFake((url: string, options: any) => {
        if (options.method === 'PROPFIND') {
          return Promise.resolve(htmlResponse);
        }
        return Promise.resolve(createMockResponse(500));
      });

      await expectAsync(api.getFileMeta('test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle HTML error pages instead of file content in download', async () => {
      const htmlResponse = createMockResponse(
        200,
        {},
        '<html><body>There is nothing here, sorry</body></html>',
      );

      mockFetch.and.returnValue(Promise.resolve(htmlResponse));

      await expectAsync(api.download({ path: 'test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });

    it('should handle empty XML response in parsePropsFromXml', async () => {
      const emptyResponse = createMockResponse(207, {}, '');

      mockFetch.and.returnValue(Promise.resolve(emptyResponse));

      await expectAsync(api.getFileMeta('test.txt', null)).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });
  });
});
