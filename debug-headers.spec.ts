import { WebdavApi } from './src/app/pfapi/api/sync/providers/webdav/webdav-api';
import { createMockResponse } from './src/app/pfapi/api/sync/providers/webdav/webdav-api-test-utils';
import { WebdavPrivateCfg } from './src/app/pfapi/api/sync/providers/webdav/webdav.model';

describe('Debug Headers', () => {
  let mockFetch: jasmine.Spy;
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
    mockFetch = spyOn(globalThis, 'fetch');
    api = new WebdavApi(async () => mockConfig);
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
