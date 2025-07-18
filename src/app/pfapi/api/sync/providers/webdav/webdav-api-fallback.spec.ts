import { WebdavApi } from './webdav-api';
import {
  createMockResponse,
  createMockResponseFactory,
  createPropfindResponse,
} from './webdav-api-test-utils';
import { RemoteFileNotFoundAPIError } from '../../../errors/errors';
import { WebdavPrivateCfg } from './webdav.model';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Fallback Logic', () => {
  let api: WebdavApi;
  let mockFetch: jasmine.Spy;
  let originalFetch: typeof fetch;

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

  describe('upload with Last-Modified fallback', () => {
    it('should use Last-Modified when server does not support ETags', async () => {
      const testData = 'test file content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server to only support Last-Modified
      const configWithCapabilities: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithCapabilities = new WebdavApi(async () => configWithCapabilities);

      const uploadResponseFactory = createMockResponseFactory(201, {
        'last-modified': lastModified,
      });

      mockFetch.and.callFake(() => Promise.resolve(uploadResponseFactory()));

      const result = await apiWithCapabilities.upload({
        path: '/test.txt',
        data: testData,
      });

      expect(result).toBe(lastModified);

      // Verify the upload was made
      expect(mockFetch).toHaveBeenCalled();
      const putCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1].method === 'PUT');
      expect(putCalls.length).toBe(1);
    });

    it('should handle conditional upload with Last-Modified', async () => {
      const testData = 'updated content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server to only support Last-Modified
      const configWithCapabilities: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithCapabilities = new WebdavApi(async () => configWithCapabilities);

      const uploadResponseFactory = createMockResponseFactory(200, {
        'last-modified': 'Thu, 22 Oct 2015 08:30:00 GMT',
      });

      mockFetch.and.callFake(() => Promise.resolve(uploadResponseFactory()));

      const result = await apiWithCapabilities.upload({
        path: '/test.txt',
        data: testData,
        expectedEtag: lastModified, // Will be used as Last-Modified
      });

      expect(result).toBe('Thu, 22 Oct 2015 08:30:00 GMT'); // The new Last-Modified from response

      // Find the PUT request call (may be after capability detection)
      const putCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1].method === 'PUT');
      expect(putCalls.length).toBeGreaterThan(0);

      const putCall = putCalls[putCalls.length - 1];
      // Verify If-Unmodified-Since header was used
      const headers = putCall.args[1].headers;
      // Headers could be a Headers object, so we need to check differently
      if (headers instanceof Headers) {
        expect(headers.get('If-Unmodified-Since')).toBe(lastModified);
        expect(headers.get('If-Match')).toBeNull();
      } else {
        expect(headers['If-Unmodified-Since']).toBe(lastModified);
        expect(headers['If-Match']).toBeUndefined();
      }
    });
  });

  describe('download with Last-Modified fallback', () => {
    it('should return Last-Modified when no ETag available', async () => {
      const fileContent = 'file content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      const downloadResponseFactory = createMockResponseFactory(
        200,
        {
          'last-modified': lastModified,
          'content-type': 'text/plain',
        },
        fileContent,
      );

      mockFetch.and.callFake(() => Promise.resolve(downloadResponseFactory()));

      const result = await api.download({ path: '/test.txt' });

      expect(result.dataStr).toBe(fileContent);
      expect(result.rev).toBe(lastModified);
    });

    it('should handle conditional download with Last-Modified', async () => {
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server to only support Last-Modified
      const configWithCapabilities: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithCapabilities = new WebdavApi(async () => configWithCapabilities);

      // 304 Not Modified response
      const notModifiedResponseFactory = createMockResponseFactory(304, {
        'last-modified': lastModified,
      });

      mockFetch.and.callFake(() => Promise.resolve(notModifiedResponseFactory()));

      await expectAsync(
        apiWithCapabilities.download({ path: '/test.txt', localRev: lastModified }),
      ).toBeRejectedWith(
        jasmine.objectContaining({
          status: 304,
          localRev: lastModified,
        }),
      );

      // Find the GET request call (may be after capability detection)
      const getCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1].method === 'GET' || !call.args[1].method);
      expect(getCalls.length).toBeGreaterThan(0);

      const getCall = getCalls[getCalls.length - 1];
      // Should use If-Modified-Since for GET requests with Last-Modified
      const headers = getCall.args[1].headers;
      if (headers instanceof Headers) {
        expect(headers.get('If-Modified-Since')).toBe(lastModified);
      } else {
        expect(headers['If-Modified-Since']).toBe(lastModified);
      }
    });
  });

  describe('getFileMeta with Last-Modified fallback', () => {
    it('should extract Last-Modified from PROPFIND response', async () => {
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      const propfindResponseFactory = createMockResponseFactory(
        207,
        {
          'content-type': 'application/xml',
        },
        createPropfindResponse('/test.txt', {
          displayname: 'test.txt',
          getlastmodified: lastModified,
          getcontentlength: '1234',
          getcontenttype: 'text/plain',
        }),
      );

      mockFetch.and.callFake(() => Promise.resolve(propfindResponseFactory()));

      const result = await api.getFileMeta('/test.txt', null);

      expect(result.etag).toBe(lastModified);
      expect(result.lastmod).toBe(lastModified);
    });

    it('should use HEAD fallback when PROPFIND fails', async () => {
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server to skip capability detection by providing pre-configured capabilities
      const configWithCapabilities: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithCapabilities = new WebdavApi(async () => configWithCapabilities);

      // Set up mock to fail PROPFIND but succeed with HEAD
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';
        if (method === 'PROPFIND') {
          return Promise.reject(new Error('PROPFIND not supported'));
        } else if (method === 'HEAD') {
          return Promise.resolve(
            createMockResponse(200, {
              'last-modified': lastModified,
              'content-length': '1234',
              'content-type': 'text/plain',
            }),
          );
        }
        return Promise.reject(new Error(`Unexpected method: ${method}`));
      });

      const result = await apiWithCapabilities.getFileMeta('/test.txt', null);

      expect(result.etag).toBe(lastModified);

      // Verify HEAD was used as fallback
      const headCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1]?.method === 'HEAD');
      expect(headCalls.length).toBe(1);
    });
  });

  describe('remove with Last-Modified validation', () => {
    it('should handle delete with Last-Modified validation', async () => {
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Configure server capabilities
      const configWithCapabilities: WebdavPrivateCfg = {
        ...mockConfig,
        serverCapabilities: {
          supportsETags: false,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: false,
        },
      };

      const apiWithCapabilities = new WebdavApi(async () => configWithCapabilities);

      // Mock getFileMeta to return file exists
      spyOn(apiWithCapabilities, 'getFileMeta').and.returnValue(
        Promise.resolve({
          etag: lastModified,
          filename: 'test.txt',
          basename: 'test.txt',
          lastmod: lastModified,
          size: 100,
          type: 'file',
          data: {},
        }),
      );

      const deleteResponseFactory = createMockResponseFactory(204, {});
      mockFetch.and.callFake(() => Promise.resolve(deleteResponseFactory()));

      await apiWithCapabilities.remove('/test.txt', lastModified);

      // Find the DELETE request call (may be after capability detection)
      const deleteCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1].method === 'DELETE');
      expect(deleteCalls.length).toBeGreaterThan(0);

      const deleteCall = deleteCalls[deleteCalls.length - 1];
      // Should use If-Unmodified-Since for DELETE with Last-Modified
      const headers = deleteCall.args[1].headers;
      if (headers instanceof Headers) {
        expect(headers.get('If-Unmodified-Since')).toBe(lastModified);
        expect(headers.get('If-Match')).toBeNull();
      } else {
        expect(headers['If-Unmodified-Since']).toBe(lastModified);
        expect(headers['If-Match']).toBeUndefined();
      }
    });
  });

  describe('NoRevAPIError handling and retry logic', () => {
    it('should detect capabilities and retry when no validator is available', async () => {
      const testData = 'test content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Initial upload returns 201 with no validator headers
      const initialUploadResponse = createMockResponse(201, {});

      // Capability detection response showing only Last-Modified support
      const propfindCapabilityResponse = createMockResponse(
        207,
        {
          'content-type': 'application/xml',
        },
        createPropfindResponse('/sync/', {
          displayname: 'sync',
          getlastmodified: lastModified,
          resourcetype: 'collection',
        }),
      );

      // Retry upload response with Last-Modified
      const retryResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      let callCount = 0;
      mockFetch.and.callFake((url, options) => {
        callCount++;
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          if (callCount === 1) {
            // Initial upload - returns no validator headers
            return Promise.resolve(initialUploadResponse);
          } else {
            // Retry upload after capability detection
            return Promise.resolve(retryResponse);
          }
        } else if (method === 'PROPFIND') {
          if (url.includes('/test.txt')) {
            // PROPFIND for getFileMeta fallback - fails
            return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
          } else {
            // Capability detection PROPFIND
            return Promise.resolve(propfindCapabilityResponse);
          }
        } else if (method === 'GET') {
          // GET for download fallback - fails
          return Promise.reject(new RemoteFileNotFoundAPIError('/test.txt'));
        }
        throw new Error(`Unexpected call: ${method} at call ${callCount}`);
      });

      const result = await api.upload({ path: '/test.txt', data: testData });

      expect(result).toBe(lastModified);

      // Just verify the result is correct - the retry mechanism is tested implicitly
      // by the fact that we get a Last-Modified value back
    });
  });

  describe('Mixed server capabilities', () => {
    it('should prefer ETag when both ETag and Last-Modified available', async () => {
      const etag = '"abc123"';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      const responseFactory = createMockResponseFactory(
        200,
        {
          etag: etag,
          'last-modified': lastModified,
        },
        'content',
      );

      mockFetch.and.callFake(() => Promise.resolve(responseFactory()));

      const result = await api.download({ path: '/test.txt' });

      expect(result.rev).toBe('abc123'); // ETag cleaned
    });
  });
});
