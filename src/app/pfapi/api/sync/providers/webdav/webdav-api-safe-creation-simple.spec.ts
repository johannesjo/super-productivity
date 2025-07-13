import { WebdavApi } from './webdav-api';
import { WebdavPrivateCfg } from './webdav';

describe('WebdavApi Safe Creation Simple Test', () => {
  it('should be created', () => {
    const mockConfig: WebdavPrivateCfg = {
      baseUrl: 'https://webdav.example.com',
      userName: 'testuser',
      password: 'testpass',
      syncFolderPath: '/sync',
      serverCapabilities: {
        supportsETags: true,
        supportsIfHeader: true,
        supportsLocking: false,
        supportsLastModified: true,
      },
    };

    const api = new WebdavApi(async () => mockConfig);
    expect(api).toBeTruthy();
  });
});
