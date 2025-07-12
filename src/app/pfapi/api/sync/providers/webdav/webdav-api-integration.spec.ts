import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { createMockResponse } from './webdav-api-test-utils';
import { RemoteFileNotFoundAPIError, NoEtagAPIError } from '../../../errors/errors';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Integration Tests - Last-Modified Fallbacks', () => {
  let mockFetch: jasmine.Spy;
  let api: WebdavApi;

  const mockConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    mockFetch = spyOn(globalThis, 'fetch');
    api = new WebdavApi(async () => mockConfig);
  });

  describe('Full workflow with ETag-only server', () => {
    it('should complete full sync workflow with ETag support', async () => {
      // Configure server with ETag support only
      const configWithEtag: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: true,
          supportsLastModified: false,
          supportsIfHeader: true,
          supportsLocking: false,
        },
      };

      const apiWithEtag = new WebdavApi(async () => configWithEtag);

      // Mock responses
      const uploadResponse = createMockResponse(201, {
        etag: '"v1"',
      });

      const downloadResponse = createMockResponse(
        200,
        {
          etag: '"v1"',
        },
        'file content v1',
      );

      const updateResponse = createMockResponse(200, {
        etag: '"v2"',
      });

      const deleteResponse = createMockResponse(204);

      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'PUT' && callCount === 1) {
          // Initial upload for new file creation
          return Promise.resolve(uploadResponse);
        } else if (method === 'GET' && callCount === 2) {
          // Download
          return Promise.resolve(downloadResponse);
        } else if (method === 'PUT' && callCount === 3) {
          // Update - conditional update
          return Promise.resolve(updateResponse);
        } else if (method === 'PROPFIND' && callCount === 4) {
          // getFileMeta call before delete to check resource type
          return Promise.resolve(
            createMockResponse(
              207,
              {
                'content-type': 'application/xml',
              },
              `<?xml version="1.0"?>
              <d:multistatus xmlns:d="DAV:">
                <d:response>
                  <d:href>/test.txt</d:href>
                  <d:propstat>
                    <d:prop>
                      <d:getetag>"v2"</d:getetag>
                      <d:resourcetype/>
                    </d:prop>
                    <d:status>HTTP/1.1 200 OK</d:status>
                  </d:propstat>
                </d:response>
              </d:multistatus>`,
            ),
          );
        } else if (method === 'DELETE' && callCount === 5) {
          // Delete with conditional headers
          return Promise.resolve(deleteResponse);
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      // 1. Create new file
      const createResult = await apiWithEtag.upload({
        path: '/test.txt',
        data: 'file content v1',
        isOverwrite: false,
      });
      expect(createResult).toBe('v1');

      // 2. Download file
      const downloadResult = await apiWithEtag.download({ path: '/test.txt' });
      expect(downloadResult.rev).toBe('v1');
      expect(downloadResult.dataStr).toBe('file content v1');

      // 3. Update file
      const updateResult = await apiWithEtag.upload({
        path: '/test.txt',
        data: 'file content v2',
        expectedEtag: 'v1',
      });
      expect(updateResult).toBe('v2');

      // 4. Delete file
      await apiWithEtag.remove('/test.txt', 'v2');

      expect(callCount).toBe(5);
    });
  });

  describe('Full workflow with Last-Modified-only server', () => {
    it('should complete full sync workflow with Last-Modified fallback', async () => {
      // Configure server with Last-Modified support only
      const configWithLastModified: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: true,
        },
      };

      const apiWithLastModified = new WebdavApi(async () => configWithLastModified);

      const timestamp1 = 'Wed, 21 Oct 2015 07:28:00 GMT';
      const timestamp2 = 'Thu, 22 Oct 2015 08:30:00 GMT';

      // Mock responses
      const lockResponse = createMockResponse(
        200,
        {
          'lock-token': '<opaquelocktoken:abc123>',
        },
        `<?xml version="1.0"?>
        <d:prop xmlns:d="DAV:">
          <d:lockdiscovery>
            <d:activelock>
              <d:locktoken>
                <d:href>opaquelocktoken:abc123</d:href>
              </d:locktoken>
            </d:activelock>
          </d:lockdiscovery>
        </d:prop>`,
      );

      const uploadResponse = createMockResponse(201, {
        'last-modified': timestamp1,
      });

      const downloadResponse = createMockResponse(
        200,
        {
          'last-modified': timestamp1,
        },
        'file content v1',
      );

      const updateResponse = createMockResponse(200, {
        'last-modified': timestamp2,
      });

      const deleteResponse = createMockResponse(204);

      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'LOCK' && callCount === 1) {
          // Lock for safe creation
          return Promise.resolve(lockResponse);
        } else if (method === 'PUT' && callCount === 2) {
          // Initial upload with lock token
          return Promise.resolve(uploadResponse);
        } else if (method === 'UNLOCK' && callCount === 3) {
          // Unlock after creation
          return Promise.resolve(createMockResponse(204));
        } else if (method === 'GET' && callCount === 4) {
          // Download
          return Promise.resolve(downloadResponse);
        } else if (method === 'PUT' && callCount === 5) {
          // Update with Last-Modified conditional headers
          return Promise.resolve(updateResponse);
        } else if (method === 'PROPFIND' && callCount === 6) {
          // getFileMeta call before delete to check resource type
          return Promise.resolve(
            createMockResponse(
              207,
              {
                'content-type': 'application/xml',
              },
              `<?xml version="1.0"?>
              <d:multistatus xmlns:d="DAV:">
                <d:response>
                  <d:href>/test.txt</d:href>
                  <d:propstat>
                    <d:prop>
                      <d:getlastmodified>${timestamp2}</d:getlastmodified>
                      <d:resourcetype/>
                    </d:prop>
                    <d:status>HTTP/1.1 200 OK</d:status>
                  </d:propstat>
                </d:response>
              </d:multistatus>`,
            ),
          );
        } else if (method === 'DELETE' && callCount === 7) {
          // Delete with Last-Modified conditional headers
          return Promise.resolve(deleteResponse);
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      // 1. Create new file (with LOCK/UNLOCK)
      const createResult = await apiWithLastModified.upload({
        path: '/test.txt',
        data: 'file content v1',
        isOverwrite: false,
      });
      expect(createResult).toBe(timestamp1);

      // 2. Download file
      const downloadResult = await apiWithLastModified.download({ path: '/test.txt' });
      expect(downloadResult.rev).toBe(timestamp1);
      expect(downloadResult.dataStr).toBe('file content v1');

      // 3. Update file
      const updateResult = await apiWithLastModified.upload({
        path: '/test.txt',
        data: 'file content v2',
        expectedEtag: timestamp1,
      });
      expect(updateResult).toBe(timestamp2);

      // 4. Delete file
      await apiWithLastModified.remove('/test.txt', timestamp2);

      expect(callCount).toBe(7);
    });
  });

  describe('Mixed server capabilities workflow', () => {
    it('should handle server that supports both ETag and Last-Modified', async () => {
      // Configure server with both ETag and Last-Modified support
      const configWithBoth: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: true,
          supportsLastModified: true,
          supportsIfHeader: true,
          supportsLocking: true,
        },
      };

      const apiWithBoth = new WebdavApi(async () => configWithBoth);

      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Mock responses with both validators
      const uploadResponse = createMockResponse(201, {
        etag: '"v1"',
        'last-modified': timestamp,
      });

      const downloadResponse = createMockResponse(
        200,
        {
          etag: '"v1"',
          'last-modified': timestamp,
        },
        'file content',
      );

      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          // Should prefer ETag over Last-Modified for safe creation
          return Promise.resolve(uploadResponse);
        } else if (method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      // Should use ETag even though Last-Modified is available
      const result = await apiWithBoth.upload({
        path: '/test.txt',
        data: 'file content',
        isOverwrite: false,
      });
      expect(result).toBe('v1');

      const download = await apiWithBoth.download({ path: '/test.txt' });
      expect(download.rev).toBe('v1'); // Should return ETag, not Last-Modified
    });
  });

  describe('Capability detection and adaptation', () => {
    it('should detect capabilities and adapt strategy mid-workflow', async () => {
      // Start without pre-configured capabilities
      const apiWithoutCapabilities = new WebdavApi(async () => mockConfig);

      // Mock capability detection
      const capabilityDetectionResponse = createMockResponse(
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

      const timestamp = 'Thu, 22 Oct 2015 08:30:00 GMT';

      // First upload fails with no validator
      const firstUploadResponse = createMockResponse(201, {});

      // Retry succeeds with Last-Modified
      const retryUploadResponse = createMockResponse(201, {
        'last-modified': timestamp,
      });

      let uploadAttempts = 0;
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          uploadAttempts++;
          if (uploadAttempts === 1) {
            return Promise.resolve(firstUploadResponse);
          } else {
            return Promise.resolve(retryUploadResponse);
          }
        } else if (method === 'PROPFIND') {
          if (url.includes('/test.txt')) {
            return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
          } else {
            // Capability detection
            return Promise.resolve(capabilityDetectionResponse);
          }
        } else if (method === 'GET') {
          return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      const result = await apiWithoutCapabilities.upload({
        path: '/test.txt',
        data: 'content',
      });

      expect(result).toBe(timestamp);
      expect(uploadAttempts).toBe(2);
    });
  });

  describe('Error recovery scenarios', () => {
    it('should handle partial failures gracefully', async () => {
      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // LOCK fails, but upload still works
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'LOCK') {
          return Promise.reject(new Error('Lock not supported'));
        } else if (method === 'PUT') {
          return Promise.resolve(
            createMockResponse(201, {
              'last-modified': timestamp,
            }),
          );
        }
        throw new Error(`Unexpected call: ${method}`);
      });

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

      // Should succeed despite lock failure
      const result = await apiWithLocking.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe(timestamp);
    });

    it('should provide clear error when no fallback works', async () => {
      // Server returns no validators
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          return Promise.resolve(createMockResponse(201, {}));
        } else if (method === 'PROPFIND' || method === 'GET') {
          return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      const configNoValidators: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: true,
          supportsLastModified: false,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiNoValidators = new WebdavApi(async () => configNoValidators);

      await expectAsync(
        apiNoValidators.upload({ path: '/test.txt', data: 'content' }),
      ).toBeRejectedWith(jasmine.any(NoEtagAPIError));
    });
  });

  describe('Performance considerations', () => {
    it('should cache detected capabilities to avoid repeated detection', async () => {
      const timestamp = 'Wed, 21 Oct 2015 07:28:00 GMT';

      let propfindCount = 0;
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PROPFIND') {
          propfindCount++;
          if (url.includes('/sync/')) {
            // Capability detection
            return Promise.resolve(
              createMockResponse(
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
                        <d:getlastmodified>${timestamp}</d:getlastmodified>
                      </d:prop>
                      <d:status>HTTP/1.1 200 OK</d:status>
                    </d:propstat>
                  </d:response>
                </d:multistatus>`,
              ),
            );
          }
        } else if (method === 'PUT') {
          return Promise.resolve(
            createMockResponse(201, {
              'last-modified': timestamp,
            }),
          );
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      // First call triggers detection
      const capabilities1 = await api.detectServerCapabilities();
      expect(capabilities1.supportsLastModified).toBe(true);
      expect(propfindCount).toBe(1);

      // Second call uses cache
      const capabilities2 = await api.detectServerCapabilities();
      expect(capabilities2).toEqual(capabilities1);
      expect(propfindCount).toBe(1); // No additional PROPFIND

      // Upload operations use cached capabilities
      await api.upload({ path: '/test1.txt', data: 'content1' });
      await api.upload({ path: '/test2.txt', data: 'content2' });
      expect(propfindCount).toBe(1); // Still no additional PROPFIND
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain backward compatibility with existing ETag-based code', async () => {
      // Test that existing code expecting ETags continues to work
      const uploadResponse = createMockResponse(201, {
        etag: '"abc123"',
      });

      const downloadResponse = createMockResponse(
        200,
        {
          etag: '"abc123"',
        },
        'content',
      );

      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          return Promise.resolve(uploadResponse);
        } else if (method === 'GET') {
          return Promise.resolve(downloadResponse);
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      // Should return cleaned ETag as before
      const uploadResult = await api.upload({ path: '/test.txt', data: 'content' });
      expect(uploadResult).toBe('abc123');

      const downloadResult = await api.download({ path: '/test.txt' });
      expect(downloadResult.rev).toBe('abc123');
      expect(downloadResult.dataStr).toBe('content');
    });
  });
});
