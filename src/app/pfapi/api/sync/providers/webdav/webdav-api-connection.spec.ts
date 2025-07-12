/* eslint-disable @typescript-eslint/naming-convention */
import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';

describe('WebdavApi - Connection Testing', () => {
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

  describe('testConnection', () => {
    it('should return success when connection works', async () => {
      const propfindResponse = `<?xml version="1.0" encoding="utf-8"?>
        <d:multistatus xmlns:d="DAV:">
          <d:response>
            <d:href>/</d:href>
            <d:propstat>
              <d:prop>
                <d:resourcetype><d:collection/></d:resourcetype>
              </d:prop>
              <d:status>HTTP/1.1 200 OK</d:status>
            </d:propstat>
          </d:response>
        </d:multistatus>`;

      const mockResponse = createMockResponse(207, {}, propfindResponse);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result).toEqual({
        success: true,
        message: 'WebDAV connection successful',
        details: {
          baseUrl: 'https://webdav.example.com',
          status: 207,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/',
        jasmine.objectContaining({
          method: 'PROPFIND',
          headers: jasmine.any(Headers),
          body: jasmine.stringContaining('<?xml'),
        }),
      );

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Depth')).toBe('0');
      expect(headers.get('Content-Type')).toBe('application/xml');
    });

    it('should return failure with auth error message for 401', async () => {
      const mockResponse = createMockResponse(401);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV 401');
    });

    it('should return failure with auth error message for 403', async () => {
      const mockResponse = createMockResponse(403);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV 403');
    });

    it('should return failure with network error message', async () => {
      const networkError = new Error('Network request failed');
      mockFetch.and.returnValue(Promise.reject(networkError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV connection failed');
      expect(result.message).toContain('Network request failed');
    });

    it('should return failure with generic error for 500', async () => {
      const mockResponse = createMockResponse(500);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV connection failed');
    });

    it('should handle 404 as failure', async () => {
      const mockResponse = createMockResponse(404);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV connection failed');
    });

    it('should include Authorization header', async () => {
      const mockResponse = createMockResponse(207);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.testConnection();

      const call = mockFetch.calls.mostRecent();
      const headers = call.args[1].headers;
      expect(headers.get('Authorization')).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockFetch.and.returnValue(Promise.reject(timeoutError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Request timeout');
    });

    it('should handle invalid URL errors', async () => {
      const invalidUrlError = new TypeError('Invalid URL');
      mockFetch.and.returnValue(Promise.reject(invalidUrlError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid URL');
    });

    it('should test against root path', async () => {
      const mockResponse = createMockResponse(207);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.testConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://webdav.example.com/',
        jasmine.any(Object),
      );
    });

    it('should handle HTML error response', async () => {
      const htmlError = '<!DOCTYPE html><html><body>Server Error</body></html>';
      const mockResponse = createMockResponse(200, {}, htmlError);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      // Status 200 with valid response is considered successful
      expect(result.success).toBe(true);
      expect(result.message).toContain('WebDAV connection successful');
    });

    it('should handle missing configuration', async () => {
      mockGetCfgOrError.and.returnValue(
        Promise.reject(new Error('Missing configuration')),
      );

      await expectAsync(api.testConnection()).toBeRejectedWith(
        jasmine.objectContaining({ message: 'Missing configuration' }),
      );
    });

    it('should handle successful non-207 responses', async () => {
      const mockResponse = createMockResponse(200);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      const result = await api.testConnection();

      expect(result.success).toBe(true);
      expect(result.details.status).toBe(200);
    });

    it('should provide details in error response', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).status = 401;
      mockFetch.and.returnValue(Promise.reject(authError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('WebDAV connection failed');
    });

    it('should handle certificate errors', async () => {
      const certError = new Error('Certificate has expired');
      mockFetch.and.returnValue(Promise.reject(certError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Certificate has expired');
    });

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND webdav.example.com');
      mockFetch.and.returnValue(Promise.reject(dnsError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('ENOTFOUND');
    });

    it('should handle CORS errors', async () => {
      const corsError = new TypeError('Failed to fetch');
      mockFetch.and.returnValue(Promise.reject(corsError));

      const result = await api.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch');
    });

    it('should test with proper XML body', async () => {
      const mockResponse = createMockResponse(207);
      mockFetch.and.returnValue(Promise.resolve(mockResponse));

      await api.testConnection();

      const call = mockFetch.calls.mostRecent();
      const body = call.args[1].body;
      expect(body).toContain('<?xml version="1.0" encoding="utf-8"');
      expect(body).toContain('<D:propfind xmlns:D="DAV:">');
      expect(body).toContain('<D:prop>');
    });
  });
});
