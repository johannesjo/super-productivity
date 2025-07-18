import { WebdavApi } from './webdav-api';
import { createMockResponse, createPropfindResponse } from './webdav-api-test-utils';
import { WebdavPrivateCfg } from './webdav.model';

describe('WebdavApi Capability Detection', () => {
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

  it('should detect ETag support from response headers', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getetag: '"abc123"',
      getlastmodified: 'Wed, 21 Oct 2015 07:28:00 GMT',
      resourcetype: 'collection',
    });

    const mockResponse = createMockResponse(
      207,
      {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': 'application/xml',
        /* eslint-enable @typescript-eslint/naming-convention */
        etag: '"folder-abc123"',
      },
      xmlBody,
    );

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(true);
    expect(capabilities.supportsLastModified).toBe(true);
    expect(capabilities.supportsIfHeader).toBe(true);
    expect(capabilities.supportsLocking).toBe(false);
  });

  it('should detect Last-Modified only server', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getlastmodified: 'Wed, 21 Oct 2015 07:28:00 GMT',
      resourcetype: 'collection',
    });

    const mockResponse = createMockResponse(
      207,
      {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': 'application/xml',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      xmlBody,
    );

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(false);
    expect(capabilities.supportsLastModified).toBe(true);
    expect(capabilities.supportsIfHeader).toBe(true);
    expect(capabilities.supportsLocking).toBe(false);
  });

  it('should return cached capabilities on subsequent calls', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getetag: '"abc123"',
    });

    const mockResponse = createMockResponse(207, { etag: '"test-etag"' }, xmlBody);

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    // First call should make a request
    const capabilities1 = await api.detectServerCapabilities();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should use cached result
    const capabilities2 = await api.detectServerCapabilities();
    expect(mockFetch).toHaveBeenCalledTimes(1); // Should not make another request
    expect(capabilities2).toEqual(capabilities1);
  });

  it('should use cached capabilities from config', async () => {
    const configWithCapabilities: WebdavPrivateCfg = {
      ...mockConfig,
      serverCapabilities: {
        supportsETags: false,
        supportsIfHeader: true,
        supportsLocking: true,
        supportsLastModified: true,
      },
    };

    const apiWithCachedConfig = new WebdavApi(async () => configWithCapabilities);

    const capabilities = await apiWithCachedConfig.detectServerCapabilities();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(capabilities).toEqual(configWithCapabilities.serverCapabilities!);
  });

  it('should handle detection failure gracefully', async () => {
    mockFetch.and.returnValue(Promise.reject(new Error('Network error')));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(false);
    expect(capabilities.supportsLastModified).toBe(true); // Fallback assumption
    expect(capabilities.supportsIfHeader).toBe(false);
    expect(capabilities.supportsLocking).toBe(false);
  });

  it('should detect minimal capabilities for basic HTTP server', async () => {
    const mockResponse = createMockResponse(
      404, // Not a WebDAV server
      {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': 'text/html',
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      'Not Found',
    );

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(false);
    expect(capabilities.supportsLastModified).toBe(true); // Basic assumption
    expect(capabilities.supportsIfHeader).toBe(false); // No WebDAV support
    expect(capabilities.supportsLocking).toBe(false);
  });

  it('should detect WebDAV If header support from OPTIONS response', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getetag: '\"abc123\"',
      getlastmodified: 'Wed, 21 Oct 2015 07:28:00 GMT',
      resourcetype: 'collection',
    });

    const mockResponse = createMockResponse(
      207,
      {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': 'application/xml',
        dav: '1, 2', // WebDAV compliance classes
        allow: 'GET, PUT, DELETE, PROPFIND, LOCK, UNLOCK',
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      xmlBody,
    );

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(true);
    expect(capabilities.supportsLastModified).toBe(true);
    expect(capabilities.supportsIfHeader).toBe(true);
    expect(capabilities.supportsLocking).toBe(false); // TODO: implement LOCK detection
  });

  it('should cache capabilities per server instance', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getetag: '\"abc123\"',
    });

    const mockResponse = createMockResponse(207, { etag: '\"test-etag\"' }, xmlBody);
    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    // First detection
    const capabilities1 = await api.detectServerCapabilities();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second detection should use cache
    const capabilities2 = await api.detectServerCapabilities();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(capabilities2).toBe(capabilities1); // Same object reference
  });

  it('should allow forced re-detection with different test path', async () => {
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getetag: '\"abc123\"',
    });

    const mockResponse = createMockResponse(207, { etag: '\"test-etag\"' }, xmlBody);
    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    // First detection
    await api.detectServerCapabilities();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Force re-detection by clearing cache
    (api as any)._cachedCapabilities = undefined;

    // Second detection with different path
    await api.detectServerCapabilities('/test-path');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify different path was used
    const secondCall = mockFetch.calls.all()[1];
    expect(secondCall.args[0]).toContain('/test-path');
  });

  it('should handle servers with partial WebDAV support', async () => {
    // Server supports PROPFIND but not ETags
    const xmlBody = createPropfindResponse('/sync/', {
      displayname: 'sync',
      getlastmodified: 'Wed, 21 Oct 2015 07:28:00 GMT',
      resourcetype: 'collection',
      // No getetag property
    });

    const mockResponse = createMockResponse(
      207,
      {
        /* eslint-disable @typescript-eslint/naming-convention */
        'content-type': 'application/xml',
        'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
        // No etag header
        /* eslint-enable @typescript-eslint/naming-convention */
      },
      xmlBody,
    );

    mockFetch.and.returnValue(Promise.resolve(mockResponse));

    const capabilities = await api.detectServerCapabilities();

    expect(capabilities.supportsETags).toBe(false);
    expect(capabilities.supportsLastModified).toBe(true);
    expect(capabilities.supportsIfHeader).toBe(true); // WebDAV server
    expect(capabilities.supportsLocking).toBe(false);
  });
});
