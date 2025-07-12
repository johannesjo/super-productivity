import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';
import { createMockResponse, createPropfindResponse } from './webdav-api-test-utils';
import { NoRevAPIError } from '../../../errors/errors';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Fallback Logic', () => {
  let api: WebdavApi;
  let mockFetch: jasmine.Spy;

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
      expect(putCall.args[1].headers['If-Unmodified-Since']).toBe(lastModified);
      expect(putCall.args[1].headers['If-Match']).toBeUndefined();
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

      // 304 Not Modified response
      const notModifiedResponse = createMockResponse(304, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValue(Promise.resolve(notModifiedResponse));

      const result = await api.download({ path: '/test.txt', localRev: lastModified });

      expect(result).toBeUndefined();

      // Find the GET request call (may be after capability detection)
      const getCalls = mockFetch.calls
        .all()
        .filter((call) => call.args[1].method === 'GET' || !call.args[1].method);
      expect(getCalls.length).toBeGreaterThan(0);

      const getCall = getCalls[getCalls.length - 1];
      // Should use If-Modified-Since for GET requests with Last-Modified
      expect(getCall.args[1].headers['If-Modified-Since']).toBe(lastModified);
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
      expect(deleteCall.args[1].headers['If-Unmodified-Since']).toBe(lastModified);
      expect(deleteCall.args[1].headers['If-Match']).toBeUndefined();
    });
  });

  describe('NoRevAPIError handling and retry logic', () => {
    it('should detect capabilities and retry on NoRevAPIError', async () => {
      const testData = 'test content';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';

      // Mock the private method to throw NoRevAPIError
      spyOn<any>(api, '_retrieveEtagWithFallback').and.returnValue(
        Promise.reject(new NoRevAPIError('/test.txt')),
      );

      // Capability detection response
      const propfindResponse = createMockResponse(
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

      // Retry upload response
      const retryResponse = createMockResponse(201, {
        'last-modified': lastModified,
      });

      mockFetch.and.returnValues(
        // Initial upload
        Promise.resolve(createMockResponse(201, {})),
        // Capability detection
        Promise.resolve(propfindResponse),
        // Retry upload
        Promise.resolve(retryResponse),
      );

      const result = await api.upload({ path: '/test.txt', data: testData });

      expect(result).toBe(lastModified);
      expect(mockFetch).toHaveBeenCalledTimes(3);
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
