import { DropboxApi } from './dropbox-api';
import { Dropbox, DropboxPrivateCfg } from './dropbox';
import { SyncProviderPrivateCfgStore } from '../../sync-provider-private-cfg-store';
import { SyncProviderId } from '../../../pfapi.const';

describe('DropboxApi', () => {
  let dropboxApi: DropboxApi;
  let mockDropbox: jasmine.SpyObj<Dropbox>;
  let mockPrivateCfgStore: jasmine.SpyObj<
    SyncProviderPrivateCfgStore<SyncProviderId.Dropbox>
  >;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    mockPrivateCfgStore = jasmine.createSpyObj('SyncProviderPrivateCfgStore', [
      'load',
      'updatePartial',
    ]);

    mockDropbox = jasmine.createSpyObj('Dropbox', [], {
      privateCfg: mockPrivateCfgStore,
    });

    dropboxApi = new DropboxApi('test-app-key', mockDropbox);

    // Mock fetch on globalThis for test environment
    fetchSpy = jasmine.createSpy('fetch');
    (globalThis as any).fetch = fetchSpy;
  });

  afterEach(() => {
    // Reset the spy but don't remove it
    if (fetchSpy) {
      fetchSpy.calls.reset();
    }
  });

  describe('updateAccessTokenFromRefreshTokenIfAvailable', () => {
    it('should only update token fields when refreshing tokens', async () => {
      const existingConfig: DropboxPrivateCfg = {
        accessToken: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        encryptKey: 'important-encryption-key',
      };

      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(existingConfig));

      // Mock successful token refresh response
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-access-token',
              refresh_token: 'new-refresh-token',
            }),
        } as Response),
      );

      await dropboxApi.updateAccessTokenFromRefreshTokenIfAvailable();

      expect(mockPrivateCfgStore.updatePartial).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should handle missing refresh token in response correctly', async () => {
      const existingConfig: DropboxPrivateCfg = {
        accessToken: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        encryptKey: 'important-encryption-key',
      };

      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(existingConfig));

      // Mock response without refresh_token
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-access-token',
              // No refresh_token in response
            }),
        } as Response),
      );

      await dropboxApi.updateAccessTokenFromRefreshTokenIfAvailable();

      expect(mockPrivateCfgStore.updatePartial).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'existing-refresh-token', // Should use existing
      });
    });

    it('should only update token fields with updatePartial', async () => {
      const existingConfig: DropboxPrivateCfg = {
        accessToken: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        encryptKey: 'important-encryption-key',
      };

      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(existingConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-access-token',
              refresh_token: 'new-refresh-token',
            }),
        } as Response),
      );

      await dropboxApi.updateAccessTokenFromRefreshTokenIfAvailable();

      // updatePartial should only be called with the token fields
      expect(mockPrivateCfgStore.updatePartial).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      // Should not include encryptKey or other fields in the update
      const savedConfig = mockPrivateCfgStore.updatePartial.calls.mostRecent().args[0];
      expect(savedConfig.encryptKey).toBeUndefined();
    });

    it('should throw error if no refresh token is available', async () => {
      const existingConfig: Partial<DropboxPrivateCfg> = {
        accessToken: 'old-access-token',
        // No refresh token
        encryptKey: 'important-encryption-key',
      };

      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(existingConfig as any));

      await expectAsync(
        dropboxApi.updateAccessTokenFromRefreshTokenIfAvailable(),
      ).toBeRejectedWithError();

      expect(mockPrivateCfgStore.updatePartial).not.toHaveBeenCalled();
    });

    it('should throw error if token refresh fails', async () => {
      const existingConfig: DropboxPrivateCfg = {
        accessToken: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        encryptKey: 'important-encryption-key',
      };

      mockPrivateCfgStore.load.and.returnValue(Promise.resolve(existingConfig));

      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 400,
        } as Response),
      );

      await expectAsync(
        dropboxApi.updateAccessTokenFromRefreshTokenIfAvailable(),
      ).toBeRejected();

      expect(mockPrivateCfgStore.updatePartial).not.toHaveBeenCalled();
    });
  });
});
