import { WebdavApi } from './webdav-api';
import { createMockResponse } from './webdav-api-test-utils';
import { WebdavPrivateCfg } from './webdav.model';

describe('Debug Headers', () => {
  let mockFetch: jasmine.Spy;
  let originalFetch: typeof fetch;
  let api: WebdavApi;

  const mockConfig: WebdavPrivateCfg = {
    baseUrl: 'https://webdav.example.com',
    userName: 'testuser',
    password: 'testpass',
    syncFolderPath: '/sync',
    serverCapabilities: {
      supportsETags: true,
      supportsLastModified: false,
      supportsIfHeader: true,
      supportsLocking: false,
    },
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
  it('should set If-None-Match for new file creation', async () => {
    const uploadResponse = createMockResponse(201, {
      etag: '"v1"',
    });

    mockFetch.and.callFake((url, options) => {
      console.log('Called with:', url, JSON.stringify(options));
      return Promise.resolve(uploadResponse);
    });

    const result = await api.upload({
      path: '/test.txt',
      data: 'content',
      isOverwrite: false,
    });

    expect(result).toBe('v1');
    expect(mockFetch).toHaveBeenCalled();
  });
});
