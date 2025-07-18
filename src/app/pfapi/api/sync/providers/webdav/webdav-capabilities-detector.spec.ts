import { WebdavCapabilitiesDetector } from './webdav-capabilities-detector';
import { RemoteFileNotFoundAPIError } from '../../../errors/errors';
import { WebdavPrivateCfg } from './webdav.model';

describe('WebdavCapabilitiesDetector', () => {
  let detector: WebdavCapabilitiesDetector;
  let mockMakeRequest: jasmine.Spy;

  beforeEach(() => {
    mockMakeRequest = jasmine.createSpy('makeRequest');
    detector = new WebdavCapabilitiesDetector(mockMakeRequest);
  });

  describe('detectServerCapabilities', () => {
    it('should detect ETag support from response headers', async () => {
      const mockResponse = {
        status: 207,
        headers: new Map([
          ['etag', '"test-etag"'],
          ['last-modified', 'Wed, 21 Oct 2023 07:28:00 GMT'],
        ]),
        text: () =>
          Promise.resolve('<d:prop><d:getetag>"test-etag"</d:getetag></d:prop>'),
      } as unknown as Response;

      mockMakeRequest.and.returnValue(Promise.resolve(mockResponse));

      const capabilities = await detector.detectServerCapabilities();

      expect(capabilities).toEqual({
        supportsETags: true,
        supportsIfHeader: true,
        supportsLocking: false,
        supportsLastModified: true,
      });
    });

    it('should handle 404 errors gracefully during detection', async () => {
      mockMakeRequest.and.returnValue(
        Promise.reject(new RemoteFileNotFoundAPIError('test-path')),
      );

      const capabilities = await detector.detectServerCapabilities();

      expect(capabilities).toEqual({
        supportsETags: false,
        supportsIfHeader: false,
        supportsLocking: false,
        supportsLastModified: true, // Default fallback
      });
    });

    it('should use cached capabilities on subsequent calls', async () => {
      const mockResponse = {
        status: 207,
        headers: new Map([['etag', '"test-etag"']]),
        text: () => Promise.resolve(''),
      } as unknown as Response;

      mockMakeRequest.and.returnValue(Promise.resolve(mockResponse));

      // First call
      const capabilities1 = await detector.detectServerCapabilities();
      // Second call
      const capabilities2 = await detector.detectServerCapabilities();

      expect(mockMakeRequest).toHaveBeenCalledTimes(1); // Only called once
      expect(capabilities1).toBe(capabilities2); // Same reference
    });
  });

  describe('getOrDetectCapabilities', () => {
    it('should use server capabilities from config if available', async () => {
      const cfg: WebdavPrivateCfg = {
        baseUrl: 'http://test',
        userName: 'test',
        password: 'test',
        syncFolderPath: 'test',
        serverCapabilities: {
          supportsETags: true,
          supportsIfHeader: true,
          supportsLocking: true,
          supportsLastModified: false,
        },
      };

      const capabilities = await detector.getOrDetectCapabilities(cfg);

      expect(capabilities).toEqual(cfg.serverCapabilities);
      expect(mockMakeRequest).not.toHaveBeenCalled();
    });

    it('should detect capabilities if not in config', async () => {
      const cfg: WebdavPrivateCfg = {
        baseUrl: 'http://test',
        userName: 'test',
        password: 'test',
        syncFolderPath: 'test',
      };

      const mockResponse = {
        status: 207,
        headers: new Map(),
        text: () => Promise.resolve(''),
      } as unknown as Response;

      mockMakeRequest.and.returnValue(Promise.resolve(mockResponse));

      const capabilities = await detector.getOrDetectCapabilities(cfg);

      expect(mockMakeRequest).toHaveBeenCalled();
      expect(capabilities).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear cached capabilities', async () => {
      const mockResponse = {
        status: 207,
        headers: new Map(),
        text: () => Promise.resolve(''),
      } as unknown as Response;

      mockMakeRequest.and.returnValue(Promise.resolve(mockResponse));

      // First call
      await detector.detectServerCapabilities();
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);

      // Clear cache
      detector.clearCache();

      // Second call should make a new request
      await detector.detectServerCapabilities();
      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
    });
  });
});
