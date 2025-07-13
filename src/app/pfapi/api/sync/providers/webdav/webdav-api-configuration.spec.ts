import { WebdavApi } from './webdav-api';
import {
  WebdavPrivateCfg,
  WebdavServerType,
  getRecommendedServerCapabilities,
} from './webdav';
import { createMockResponse } from './webdav-api-test-utils';

/* eslint-disable @typescript-eslint/naming-convention */

describe('WebdavApi Configuration Options', () => {
  let mockFetch: jasmine.Spy;
  let originalFetch: typeof fetch;
  let api: WebdavApi;

  const baseConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
  };

  beforeEach(() => {
    originalFetch = window.fetch;
    mockFetch = jasmine.createSpy('fetch');
    window.fetch = mockFetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  describe('basicCompatibilityMode', () => {
    it('should upload without conditional headers in basic compatibility mode', async () => {
      const configWithBasicMode: WebdavPrivateCfg = {
        ...baseConfig,
        basicCompatibilityMode: true,
      };

      api = new WebdavApi(async () => configWithBasicMode);

      const uploadResponse = createMockResponse(201, {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT');

      const call = mockFetch.calls.mostRecent();
      expect(call.args[0]).toContain('test.txt');
      expect(call.args[1].method).toBe('PUT');

      // Check headers
      const headers = call.args[1].headers;
      if (headers instanceof Headers) {
        expect(headers.get('Content-Type')).toBe('application/octet-stream');
        expect(headers.get('Content-Length')).toBe('7');
        // Should not have any conditional headers
        expect(headers.get('If-Match')).toBeNull();
        expect(headers.get('If-None-Match')).toBeNull();
        expect(headers.get('If-Unmodified-Since')).toBeNull();
        expect(headers.get('If')).toBeNull();
      } else {
        expect(headers['Content-Type']).toBe('application/octet-stream');
        expect(headers['Content-Length']).toBe('7');
        // Should not have any conditional headers
        expect(headers['If-Match']).toBeUndefined();
        expect(headers['If-None-Match']).toBeUndefined();
        expect(headers['If-Unmodified-Since']).toBeUndefined();
        expect(headers['If']).toBeUndefined();
      }
    });
  });

  describe('preferLastModified option', () => {
    it('should prefer Last-Modified over ETag when preferLastModified is true', async () => {
      const configWithPreference: WebdavPrivateCfg = {
        ...baseConfig,
        preferLastModified: true,
        serverCapabilities: {
          supportsETags: true,
          supportsLastModified: true,
          supportsIfHeader: false,
          supportsLocking: true,
        },
      };

      api = new WebdavApi(async () => configWithPreference);

      const uploadResponse = createMockResponse(201, {
        etag: '"v1"',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      // Should return Last-Modified even though ETag is available
      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT');
    });
  });

  describe('maxRetries configuration', () => {
    it('should respect custom maxRetries setting', async () => {
      const configWithRetries: WebdavPrivateCfg = {
        ...baseConfig,
        maxRetries: 1, // Set to 1 retry only
      };

      api = new WebdavApi(async () => configWithRetries);

      // Mock detection that triggers retry
      const detectionResponse = createMockResponse(
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

      // First upload fails with no validator
      const firstUploadResponse = createMockResponse(201, {});

      // Second upload also fails
      const secondUploadResponse = createMockResponse(201, {});

      let uploadAttempts = 0;
      mockFetch.and.callFake((url, options) => {
        const method = options?.method || 'GET';

        if (method === 'PUT') {
          uploadAttempts++;
          return Promise.resolve(
            uploadAttempts === 1 ? firstUploadResponse : secondUploadResponse,
          );
        } else if (method === 'PROPFIND') {
          if (url.includes('/test.txt')) {
            return Promise.reject(new Error('Not found'));
          } else {
            return Promise.resolve(detectionResponse);
          }
        } else if (method === 'GET') {
          return Promise.reject(new Error('Not found'));
        }
        throw new Error(`Unexpected call: ${method}`);
      });

      // Should fail after maxRetries attempts
      await expectAsync(
        api.upload({
          path: '/test.txt',
          data: 'content',
        }),
      ).toBeRejected();

      // Should have attempted exactly 2 uploads (original + 1 retry)
      expect(uploadAttempts).toBe(2);
    });
  });

  describe('getRecommendedServerCapabilities helper', () => {
    it('should return correct capabilities for Nextcloud', () => {
      const capabilities = getRecommendedServerCapabilities(WebdavServerType.NEXTCLOUD);
      expect(capabilities).toEqual({
        supportsETags: true,
        supportsIfHeader: true,
        supportsLocking: true,
        supportsLastModified: true,
      });
    });

    it('should return correct capabilities for Apache mod_dav', () => {
      const capabilities = getRecommendedServerCapabilities(
        WebdavServerType.APACHE_MOD_DAV,
      );
      expect(capabilities).toEqual({
        supportsETags: true,
        supportsIfHeader: false,
        supportsLocking: true,
        supportsLastModified: true,
      });
    });

    it('should return correct capabilities for nginx dav', () => {
      const capabilities = getRecommendedServerCapabilities(WebdavServerType.NGINX_DAV);
      expect(capabilities).toEqual({
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      });
    });

    it('should return correct capabilities for basic WebDAV', () => {
      const capabilities = getRecommendedServerCapabilities(
        WebdavServerType.BASIC_WEBDAV,
      );
      expect(capabilities).toEqual({
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true,
      });
    });
  });

  describe('Real-world configuration scenarios', () => {
    it('should work with Nextcloud recommended settings', async () => {
      const nextcloudConfig: WebdavPrivateCfg = {
        ...baseConfig,
        serverCapabilities: getRecommendedServerCapabilities(WebdavServerType.NEXTCLOUD),
      };

      api = new WebdavApi(async () => nextcloudConfig);

      const uploadResponse = createMockResponse(201, {
        etag: '"abc123"',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe('abc123'); // Should prefer ETag
    });

    it('should work with nginx dav recommended settings', async () => {
      const nginxConfig: WebdavPrivateCfg = {
        ...baseConfig,
        serverCapabilities: getRecommendedServerCapabilities(WebdavServerType.NGINX_DAV),
      };

      api = new WebdavApi(async () => nginxConfig);

      const uploadResponse = createMockResponse(201, {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT'); // Should use Last-Modified
    });

    it('should handle basic WebDAV server with minimal features', async () => {
      const basicConfig: WebdavPrivateCfg = {
        ...baseConfig,
        basicCompatibilityMode: true,
        serverCapabilities: getRecommendedServerCapabilities(
          WebdavServerType.BASIC_WEBDAV,
        ),
      };

      api = new WebdavApi(async () => basicConfig);

      const uploadResponse = createMockResponse(201, {
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
      });

      mockFetch.and.returnValue(Promise.resolve(uploadResponse));

      const result = await api.upload({
        path: '/test.txt',
        data: 'content',
        isOverwrite: false,
      });

      expect(result).toBe('Wed, 21 Oct 2015 07:28:00 GMT');

      // Should not use any conditional headers in basic mode
      const headers = mockFetch.calls.mostRecent().args[1]?.headers || {};
      expect(headers['If-Match']).toBeUndefined();
      expect(headers['If-None-Match']).toBeUndefined();
    });
  });
});
