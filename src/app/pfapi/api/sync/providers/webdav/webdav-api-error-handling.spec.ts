import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { createMockResponse } from './webdav-api-test-utils';
import {
  NoRevAPIError,
  NoEtagAPIError,
  FileExistsAPIError,
  RemoteFileNotFoundAPIError,
} from '../../../errors/errors';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Enhanced Error Handling', () => {
  let mockFetch: jasmine.Spy;
  let originalFetch: typeof fetch;
  let api: WebdavApi;

  const mockConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    originalFetch = window.fetch;
    mockFetch = jasmine.createSpy('fetch');
    window.fetch = mockFetch;
    api = new WebdavApi(async () => mockConfig);
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  describe('NoRevAPIError vs NoEtagAPIError distinction', () => {
    it('should throw NoRevAPIError when server supports Last-Modified but no validator is found', async () => {
      // Configure server with Last-Modified support only
      const configWithLastModified: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithLastModified = new WebdavApi(async () => configWithLastModified);

      // Upload succeeds but returns no Last-Modified header
      const uploadResponse = createMockResponse(201, {});

      // PROPFIND fails
      const propfindError = new RemoteFileNotFoundAPIError('/test.txt');

      // GET fails
      const getError = new RemoteFileNotFoundAPIError('/test.txt');

      let callCount = 0;
      let putCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          putCount++;
          if (putCount === 1) {
            return Promise.resolve(uploadResponse);
          }
          // Should not have a second PUT since capabilities are pre-configured
          throw new Error(`Unexpected second PUT call at call ${callCount}`);
        } else if (method === 'PROPFIND') {
          return Promise.reject(propfindError);
        } else if (method === 'GET') {
          return Promise.reject(getError);
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      await expectAsync(
        apiWithLastModified.upload({ path: '/test.txt', data: 'content' }),
      ).toBeRejectedWith(jasmine.any(NoRevAPIError));
    });

    it('should throw NoEtagAPIError when server supports ETags but no ETag is found', async () => {
      // Configure server with ETag support
      const configWithEtag: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: true,
          supportsLastModified: false,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithEtag = new WebdavApi(async () => configWithEtag);

      // Upload succeeds but returns no ETag header
      const uploadResponse = createMockResponse(201, {});

      // PROPFIND fails
      const propfindError = new RemoteFileNotFoundAPIError('/test.txt');

      // GET fails
      const getError = new RemoteFileNotFoundAPIError('/test.txt');

      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'PUT' && callCount === 1) {
          return Promise.resolve(uploadResponse);
        } else if (method === 'PROPFIND') {
          return Promise.reject(propfindError);
        } else if (method === 'GET') {
          return Promise.reject(getError);
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      await expectAsync(
        apiWithEtag.upload({ path: '/test.txt', data: 'content' }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });
  });

  describe('Error messages with context', () => {
    it('should include server capabilities in error when no safe creation method available', async () => {
      const configNoSafeCreation: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiNoSafeCreation = new WebdavApi(async () => configNoSafeCreation);

      // Spy on console.warn to capture the warning
      const warnSpy = spyOn(console, 'warn');

      const uploadResponse = createMockResponse(201, {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      await apiNoSafeCreation.upload({
        path: '/newfile.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/WARNING: No safe creation method available/),
        jasmine.objectContaining({
          supportsETags: false,
          supportsIfHeader: false,
          supportsLocking: false,
        }),
      );
    });

    it('should provide detailed error for 412 Precondition Failed with expected validator', async () => {
      const preconditionFailedResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(preconditionFailedResponse));

      await expectAsync(
        api.upload({
          path: '/test.txt',
          data: 'content',
          expectedEtag: 'old-etag',
        }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/file was modified.*old-etag/),
        }),
      );
    });

    it('should throw FileExistsAPIError for 412 without expected validator', async () => {
      const preconditionFailedResponse = createMockResponse(412);
      mockFetch.and.returnValue(Promise.resolve(preconditionFailedResponse));

      await expectAsync(
        api.upload({
          path: '/test.txt',
          data: 'content',
          isOverwrite: false,
        }),
      ).toBeRejectedWith(jasmine.any(FileExistsAPIError));
    });
  });

  describe('Lock error handling', () => {
    it('should handle 423 Locked errors with descriptive message', async () => {
      const lockedResponse = createMockResponse(423);
      mockFetch.and.returnValue(Promise.resolve(lockedResponse));

      await expectAsync(
        api.upload({ path: '/locked.txt', data: 'content' }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/Resource is locked/),
        }),
      );
    });

    it('should continue upload even if lock acquisition fails', async () => {
      const configWithLocking: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: true,
        },
      };

      const apiWithLocking = new WebdavApi(async () => configWithLocking);

      // Mock console.error to check for lock failure log
      const errorSpy = spyOn(console, 'error');

      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'LOCK') {
          // Lock fails
          return Promise.reject(new Error('Lock failed'));
        } else if (method === 'PUT') {
          // Upload succeeds anyway
          return Promise.resolve(
            createMockResponse(201, {
              'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
            }),
          );
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      const result = await apiWithLocking.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT');

      // Check that lock failure was logged
      expect(errorSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Failed to acquire lock for safe creation/),
        jasmine.any(Object),
      );
    });
  });

  describe('Fallback chain error reporting', () => {
    it('should report all attempted methods when validator retrieval fails', async () => {
      // Upload succeeds but returns no validator
      const uploadResponse = createMockResponse(201, {});

      // All fallback methods fail
      let putCount = 0;
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          putCount++;
          if (putCount === 1) {
            return Promise.resolve(uploadResponse);
          }
        } else if (method === 'PROPFIND') {
          // First PROPFIND might be for capability detection on root
          if (url.includes('/test.txt')) {
            return Promise.reject(new Error('PROPFIND failed'));
          } else {
            // Capability detection PROPFIND - return minimal response
            return Promise.resolve(
              createMockResponse(
                207,
                {
                  'content-type': 'application/xml',
                },
                `<?xml version="1.0"?>
              <d:multistatus xmlns:d="DAV:">
                <d:response>
                  <d:href>/</d:href>
                  <d:propstat>
                    <d:prop></d:prop>
                    <d:status>HTTP/1.1 200 OK</d:status>
                  </d:propstat>
                </d:response>
              </d:multistatus>`,
              ),
            );
          }
        } else if (method === 'GET') {
          return Promise.reject(new Error('GET failed'));
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      try {
        await api.upload({ path: '/test.txt', data: 'content' });
        fail('Expected NoEtagAPIError');
      } catch (error: any) {
        expect(error).toEqual(jasmine.any(NoEtagAPIError));
        expect(error.additionalLog).toEqual(
          jasmine.objectContaining({
            attemptedMethods: ['response-headers', 'PROPFIND', 'GET'],
          }),
        );
      }
    });
  });

  describe('Download error scenarios', () => {
    it('should handle 304 Not Modified gracefully', async () => {
      const notModifiedResponse = createMockResponse(304, {
        etag: '"unchanged"',
      });

      mockFetch.and.returnValue(Promise.resolve(notModifiedResponse));

      await expectAsync(
        api.download({ path: '/test.txt', localRev: 'unchanged' }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          status: 304,
          localRev: 'unchanged',
          message: jasmine.stringMatching(/not modified/i),
        }),
      );
    });

    it('should handle HTML error responses appropriately', async () => {
      const htmlError = '<html><body>404 Not Found</body></html>';
      const htmlResponse = createMockResponse(
        200,
        {
          'content-type': 'text/html',
        },
        htmlError,
      );

      mockFetch.and.returnValue(Promise.resolve(htmlResponse));

      await expectAsync(api.download({ path: '/test.txt' })).toBeRejectedWith(
        jasmine.any(RemoteFileNotFoundAPIError),
      );
    });
  });

  describe('Delete operation error handling', () => {
    it('should provide clear error for non-empty directory deletion', async () => {
      const conflictResponse = createMockResponse(409);
      mockFetch.and.returnValue(Promise.resolve(conflictResponse));

      await expectAsync(api.remove('/folder/', 'folder-etag')).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/non-empty directory/),
        }),
      );
    });

    it('should handle 424 Failed Dependency appropriately', async () => {
      const failedDepResponse = createMockResponse(424);
      mockFetch.and.returnValue(Promise.resolve(failedDepResponse));

      await expectAsync(api.remove('/dependent-file.txt')).toBeRejectedWith(
        jasmine.objectContaining({
          message: jasmine.stringMatching(/failed due to dependency/),
        }),
      );
    });
  });

  describe('Retry mechanism improvements', () => {
    it('should detect capabilities and retry when NoRevAPIError occurs', async () => {
      // Initial upload returns no validator
      const uploadResponse = createMockResponse(201, {});

      // Capability detection response
      const propfindResponse = createMockResponse(
        207,
        {
          'content-type': 'application/xml',
        },
        `<?xml version="1.0"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/sync/</d:href>
            <d:propstat>
              <d:prop>
                <d:getlastmodified>Wed, 21 Oct 2015 07:28:00 GMT</d:getlastmodified>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`,
      );

      // Retry succeeds with Last-Modified
      const retryResponse = createMockResponse(201, {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      let uploadAttempts = 0;
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.resolve(uploadResponse);
          } else {
            return Promise.resolve(retryResponse);
          }
        } else if (method === 'PROPFIND') {
          if (url.includes('/test.txt')) {
            return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
          } else {
            return Promise.resolve(propfindResponse);
          }
        } else if (method === 'GET') {
          return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      const result = await api.upload({ path: '/test.txt', data: 'content' });

      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
      expect(uploadAttempts).toBe(2);
    });
  });
});
