import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { createMockResponse, createPropfindResponse } from './webdav-api-test-utils';
import { RemoteFileNotFoundAPIError } from '../../../errors/errors';

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

      const uploadResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

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

      const uploadResponse = createMockResponse(200, {
        'last-modified': 'Thu, 22 Oct 2015 08:30:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

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

      const downloadResponse = createMockResponse(
        200,
        {
          'last-modified': lastModified,
          'content-type': 'text/plain',
        },
        fileContent,
      );

      mockFetch.and.returnValue(Promise.resolve(downloadResponse));

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
      const notModifiedResponse = createMockResponse(304, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValue(Promise.resolve(notModifiedResponse));

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

      const propfindResponse = createMockResponse(
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

      mockFetch.and.returnValue(Promise.resolve(propfindResponse));

      const result = await api.getFileMeta('/test.txt', null);

      expect(result.etag).toBe(lastModified);
      expect(result.lastmod).toBe(lastModified);
    });

    it('should use HEAD fallback when PROPFIND fails', async () => {
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // PROPFIND fails
      mockFetch.and.returnValues(
        Promise.reject(new Error('PROPFIND not supported')),
        // HEAD succeeds
        Promise.resolve(
          createMockResponse(200, {
            'last-modified': lastModified,
            'content-length': '1234',
            'content-type': 'text/plain',
          }),
        ),
      );

      const result = await api.getFileMeta('/test.txt', null);

      expect(result.etag).toBe(lastModified);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify HEAD was used as fallback
      const headCall = mockFetch.calls.all()[1];
      expect(headCall.args[1].method).toBe('HEAD');
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

      const deleteResponse = createMockResponse(204, {});
      mockFetch.and.returnValue(Promise.resolve(deleteResponse));

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

      const response = createMockResponse(
        200,
        {
          etag: etag,
          'last-modified': lastModified,
        },
        'content',
      );

      mockFetch.and.returnValue(Promise.resolve(response));

      const result = await api.download({ path: '/test.txt' });

      expect(result.rev).toBe('abc123'); // ETag cleaned
    });
  });
});
