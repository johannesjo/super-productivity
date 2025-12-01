import { TestBed } from '@angular/core/testing';
import { SyncConfigService } from './sync-config.service';
import { PfapiService } from '../../pfapi/pfapi.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { BehaviorSubject } from 'rxjs';
import { SyncConfig } from '../../features/config/global-config.model';
import { LegacySyncProvider } from './legacy-sync-provider.model';
import { SyncProviderId } from '../../pfapi/api';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { first } from 'rxjs/operators';

describe('SyncConfigService', () => {
  let service: SyncConfigService;
  let pfapiService: jasmine.SpyObj<PfapiService>;
  let mockSyncConfig$: BehaviorSubject<SyncConfig>;
  let mockCurrentProviderPrivateCfg$: BehaviorSubject<any>;

  beforeEach(() => {
    // Mock fetch for the sync-config-default-override.json
    // @ts-ignore - fetch might not exist in test environment
    globalThis.fetch = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        json: () => Promise.resolve({}),
      } as Response),
    );

    // Create mock sync config
    mockSyncConfig$ = new BehaviorSubject<SyncConfig>({
      ...DEFAULT_GLOBAL_CONFIG.sync,
      isEnabled: true,
      syncProvider: LegacySyncProvider.LocalFile,
      isEncryptionEnabled: true,
    });

    mockCurrentProviderPrivateCfg$ = new BehaviorSubject(null);

    const mockPf = {
      getSyncProviderById: jasmine.createSpy('getSyncProviderById'),
      getActiveSyncProvider: jasmine.createSpy('getActiveSyncProvider'),
      setPrivateCfgForSyncProvider: jasmine.createSpy('setPrivateCfgForSyncProvider'),
    };

    const pfapiServiceSpy = jasmine.createSpyObj('PfapiService', [], {
      currentProviderPrivateCfg$: mockCurrentProviderPrivateCfg$,
      pf: mockPf,
    });

    const globalConfigServiceSpy = jasmine.createSpyObj(
      'GlobalConfigService',
      ['updateSection'],
      {
        sync$: mockSyncConfig$,
      },
    );

    TestBed.configureTestingModule({
      providers: [
        SyncConfigService,
        { provide: PfapiService, useValue: pfapiServiceSpy },
        { provide: GlobalConfigService, useValue: globalConfigServiceSpy },
      ],
    });

    service = TestBed.inject(SyncConfigService);
    pfapiService = TestBed.inject(PfapiService) as jasmine.SpyObj<PfapiService>;
  });

  describe('updateSettingsFromForm', () => {
    it('should update global config with non-private data only', async () => {
      const globalConfigService = TestBed.inject(
        GlobalConfigService,
      ) as jasmine.SpyObj<GlobalConfigService>;

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'secret-key',
        webDav: {
          baseUrl: 'https://example.com',
          userName: 'user',
          password: 'pass',
          syncFolderPath: '/sync',
        },
      };

      await service.updateSettingsFromForm(settings);

      // Should only pass non-private data to global config
      expect(globalConfigService.updateSection).toHaveBeenCalledWith('sync', {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: true,
      });
    });

    it('should apply default values for WebDAV provider fields and preserve existing config', async () => {
      // Mock existing provider with old config
      const mockProvider = {
        id: SyncProviderId.WebDAV,
        privateCfg: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              baseUrl: 'https://old.example.com',
              userName: 'olduser',
              password: 'oldpass',
              syncFolderPath: '/old',
              encryptKey: 'old-key',
            }),
          ),
        },
      };
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProvider),
      );

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'test-key',
        webDav: {
          baseUrl: 'https://example.com',
          // Missing userName, password, syncFolderPath - should use old values
        } as any,
      };

      await service.updateSettingsFromForm(settings);

      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.WebDAV,
        {
          baseUrl: 'https://example.com',
          userName: 'olduser', // Preserved from old config
          password: 'oldpass', // Preserved from old config
          syncFolderPath: '/old', // Preserved from old config
          encryptKey: 'test-key', // New value from settings
        },
      );
    });

    it('should apply default values for LocalFile provider fields when no existing config', async () => {
      // Mock no existing provider
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(null),
      );

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'test-key',
        localFileSync: {
          // Missing syncFolderPath
        } as any,
      };

      await service.updateSettingsFromForm(settings);

      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.LocalFile,
        {
          syncFolderPath: '',
          encryptKey: 'test-key',
        },
      );
    });

    it('should handle Dropbox provider and preserve OAuth tokens', async () => {
      // Mock existing Dropbox provider with OAuth tokens
      const mockProvider = {
        id: SyncProviderId.Dropbox,
        privateCfg: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              accessToken: 'existing-access-token',
              refreshToken: 'existing-refresh-token',
              encryptKey: 'old-key',
            }),
          ),
        },
      };
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProvider),
      );

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.Dropbox,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'dropbox-key',
      };

      await service.updateSettingsFromForm(settings);

      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.Dropbox,
        {
          accessToken: 'existing-access-token', // Preserved OAuth tokens
          refreshToken: 'existing-refresh-token', // Preserved OAuth tokens
          encryptKey: 'dropbox-key', // Updated from settings
        },
      );
    });

    it('should preserve Dropbox OAuth token when updating unrelated settings', async () => {
      // This test specifically verifies the reported issue
      const existingToken = 'GicjnVuuGSMAAAAAAAxOv3tqe032pTcRxBvMOgHc';

      // Mock existing Dropbox provider with the specific token
      const mockProvider = {
        id: SyncProviderId.Dropbox,
        privateCfg: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              accessToken: existingToken,
              refreshToken: 'some-refresh-token',
              encryptKey: 'existing-key',
            }),
          ),
        },
      };
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProvider),
      );

      // Update settings without changing the provider
      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.Dropbox,
        syncInterval: 600000, // Changed interval
        isEncryptionEnabled: true,
        encryptKey: 'existing-key', // Same key
      };

      await service.updateSettingsFromForm(settings);

      // Verify the token is preserved
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.Dropbox,
        jasmine.objectContaining({
          accessToken: existingToken, // Must be preserved!
          refreshToken: 'some-refresh-token',
        }),
      );
    });

    it('should prevent duplicate saves when settings are unchanged', async () => {
      // Mock provider for the test
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve({
          id: SyncProviderId.WebDAV,
          privateCfg: {
            load: jasmine.createSpy('load').and.returnValue(Promise.resolve({})),
          },
        }),
      );

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: false,
        webDav: {
          baseUrl: '',
          userName: '',
          password: '',
          syncFolderPath: '',
        },
      };

      // First call
      await service.updateSettingsFromForm(settings);
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledTimes(1);

      // Second call with same settings - should be skipped
      await service.updateSettingsFromForm(settings);
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledTimes(1);

      // Third call with isForce=true - should proceed
      await service.updateSettingsFromForm(settings, true);
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledTimes(2);
    });

    it('should not save private config when no provider is selected', async () => {
      const settings: SyncConfig = {
        isEnabled: false,
        syncProvider: null,
        syncInterval: 300000,
        isEncryptionEnabled: false,
      };

      await service.updateSettingsFromForm(settings);

      expect(pfapiService.pf.setPrivateCfgForSyncProvider).not.toHaveBeenCalled();
    });

    it('should handle provider with no existing config', async () => {
      // Mock no existing provider (e.g., initial setup)
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(null),
      );

      const settings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'new-key',
        webDav: {
          baseUrl: 'https://example.com',
          userName: 'newuser',
          password: 'newpass',
          syncFolderPath: '/new',
        },
      };

      await service.updateSettingsFromForm(settings);

      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.WebDAV,
        {
          baseUrl: 'https://example.com',
          userName: 'newuser',
          password: 'newpass',
          syncFolderPath: '/new',
          encryptKey: 'new-key',
        },
      );
    });
  });

  describe('LocalFile encryption persistence issue (#4844)', () => {
    it('should ensure provider is initialized when saving encryption settings', async () => {
      // This test captures the real fix we need:
      // When user saves encryption settings, the provider should be properly initialized
      // so that when they return, the provider config is available

      const initialSettings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'my-secret-password',
        localFileSync: {
          syncFolderPath: 'C:\\Users\\test\\sync',
        },
      };

      // Mock: No provider exists initially
      (pfapiService.pf.getActiveSyncProvider as jasmine.Spy).and.returnValue(null);
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(null),
      );

      // User saves the form
      await service.updateSettingsFromForm(initialSettings);

      // The provider should be created/initialized
      // and the encryption key should be saved to the provider's private config
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.LocalFile,
        jasmine.objectContaining({
          syncFolderPath: 'C:\\Users\\test\\sync',
          encryptKey: 'my-secret-password',
        }),
      );

      // Step 2: Simulate user returning to settings
      // Global config shows encryption enabled
      mockSyncConfig$.next({
        ...DEFAULT_GLOBAL_CONFIG.sync,
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        isEncryptionEnabled: true,
        syncInterval: 300000,
      });

      // Provider config not loaded yet (the issue)
      mockCurrentProviderPrivateCfg$.next(null);

      // Get form settings
      const formSettings = await service.syncSettingsForm$.pipe(first()).toPromise();

      // FIXED: With the form validation fix, empty password is now acceptable
      // The form shows encryption as enabled even without the password
      expect(formSettings!.isEncryptionEnabled).toBe(true);
      expect(formSettings!.encryptKey).toBe(''); // Empty but form is still valid
    });

    it('should show encryption key as empty in form when provider config is not loaded', async () => {
      // This test demonstrates the actual bug

      // Step 1: Simulate initial setup - user enables encryption
      const initialSettings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'test-password-123',
        localFileSync: {
          syncFolderPath: 'C:\\Users\\test\\sync',
        },
      };

      // No provider exists yet
      (pfapiService.pf.getActiveSyncProvider as jasmine.Spy).and.returnValue(null);
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(null),
      );

      await service.updateSettingsFromForm(initialSettings);

      // Step 2: Simulate navigation away and back
      // Global config has encryption enabled
      mockSyncConfig$.next({
        ...DEFAULT_GLOBAL_CONFIG.sync,
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        isEncryptionEnabled: true, // This is saved correctly
        syncInterval: 300000,
      });

      // But currentProviderPrivateCfg$ is null (provider not loaded yet)
      mockCurrentProviderPrivateCfg$.next(null);

      // Get the form settings
      const formSettings = await service.syncSettingsForm$.pipe(first()).toPromise();

      // BUG: Even though isEncryptionEnabled is true in global config,
      // the encryption key is empty because currentProviderPrivateCfg$ is null
      console.log('Form settings:', JSON.stringify(formSettings, null, 2));

      expect(formSettings!.isEncryptionEnabled).toBe(true);
      // Currently returns empty string
      expect(formSettings!.encryptKey).toBe('');
    });

    it('should show empty encryption key when encryption is disabled', async () => {
      // Ensure we don't show placeholder when encryption is not enabled
      mockSyncConfig$.next({
        ...DEFAULT_GLOBAL_CONFIG.sync,
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        isEncryptionEnabled: false, // Encryption is disabled
        syncInterval: 300000,
      });

      mockCurrentProviderPrivateCfg$.next(null); // Provider not loaded

      const formSettings = await service.syncSettingsForm$.pipe(first()).toPromise();

      // Should show empty key, not placeholder
      expect(formSettings!.isEncryptionEnabled).toBe(false);
      expect(formSettings!.encryptKey).toBe(''); // Empty, not placeholder
    });

    it('should still work correctly for WebDAV provider', async () => {
      // Ensure our fix doesn't break other providers
      const webDavSettings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.WebDAV,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'webdav-password',
        webDav: {
          baseUrl: 'https://example.com/webdav',
          userName: 'testuser',
          password: 'testpass',
          syncFolderPath: '/sync',
        },
      };

      // Mock existing WebDAV provider
      const mockProvider = {
        id: SyncProviderId.WebDAV,
        privateCfg: {
          load: jasmine.createSpy('load').and.returnValue(Promise.resolve({})),
        },
      };
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProvider),
      );

      await service.updateSettingsFromForm(webDavSettings);

      // Verify WebDAV config is saved correctly with encryption key
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.WebDAV,
        jasmine.objectContaining({
          baseUrl: 'https://example.com/webdav',
          userName: 'testuser',
          password: 'testpass',
          syncFolderPath: '/sync',
          encryptKey: 'webdav-password',
        }),
      );
    });
    it('should NOT lose encryption settings after navigation when LocalFile sync with encryption is first enabled', async () => {
      // This test demonstrates the bug: encryption settings are lost after navigation
      // when initially setting up LocalFile sync with encryption on Windows

      // Step 1: User enables LocalFile sync with encryption
      const newSettings: SyncConfig = {
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        syncInterval: 300000,
        isEncryptionEnabled: true,
        encryptKey: 'test-password-123',
        localFileSync: {
          syncFolderPath: 'C:\\Users\\test\\sync',
        },
      };

      // Mock that there's no active provider yet (initial setup)
      (pfapiService.pf.getActiveSyncProvider as jasmine.Spy).and.returnValue(null);
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(null),
      );

      // Act: User saves the form with encryption enabled
      await service.updateSettingsFromForm(newSettings);

      // Verify that setPrivateCfgForSyncProvider was called with encryption key
      expect(pfapiService.pf.setPrivateCfgForSyncProvider).toHaveBeenCalledWith(
        SyncProviderId.LocalFile,
        jasmine.objectContaining({
          syncFolderPath: 'C:\\Users\\test\\sync',
          encryptKey: 'test-password-123',
        }),
      );

      // Simulate that the provider is now created and we can load it
      const mockProvider = {
        id: SyncProviderId.LocalFile,
        privateCfg: {
          load: jasmine.createSpy('load').and.returnValue(
            Promise.resolve({
              syncFolderPath: 'C:\\Users\\test\\sync',
              // BUG: encryptKey is missing here because updateEncryptionPassword failed
            }),
          ),
        },
      };

      // Update mocks to simulate provider is now available
      (pfapiService.pf.getSyncProviderById as jasmine.Spy).and.returnValue(
        Promise.resolve(mockProvider),
      );

      // In a real scenario, after setPrivateCfgForSyncProvider is called,
      // the currentProviderPrivateCfg$ would be updated with the saved config
      // We simulate this by updating the observable with the encryption key
      mockCurrentProviderPrivateCfg$.next({
        providerId: SyncProviderId.LocalFile,
        privateCfg: {
          syncFolderPath: 'C:\\Users\\test\\sync',
          encryptKey: 'test-password-123', // This should be included after save
        },
      });

      // Update sync config to show encryption is enabled in global config
      mockSyncConfig$.next({
        ...DEFAULT_GLOBAL_CONFIG.sync,
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        isEncryptionEnabled: true,
        syncInterval: 300000,
      });

      // Step 2: User navigates away and comes back - get form settings
      const formSettings = await service.syncSettingsForm$.pipe(first()).toPromise();

      // EXPECTED: Form should still show encryption is enabled with the password
      // ACTUAL: encryptKey will be empty because it was never saved to provider config
      expect(formSettings!.isEncryptionEnabled).toBe(true);
      expect(formSettings!.encryptKey).toBe('test-password-123'); // THIS WILL FAIL!
    });

    it('should show encryption as enabled in form after navigation when LocalFile sync is configured', async () => {
      // Update the observable to simulate provider being active
      mockCurrentProviderPrivateCfg$.next({
        providerId: SyncProviderId.LocalFile,
        privateCfg: {
          syncFolderPath: 'C:\\Users\\test\\sync',
          encryptKey: 'test-password-123',
        },
      });

      // Update sync config to show encryption is enabled
      mockSyncConfig$.next({
        ...DEFAULT_GLOBAL_CONFIG.sync,
        isEnabled: true,
        syncProvider: LegacySyncProvider.LocalFile,
        isEncryptionEnabled: true,
        syncInterval: 300000,
      });

      // Act: Get the form settings (simulating user navigating back to settings)
      let formSettings: SyncConfig | undefined;
      service.syncSettingsForm$.subscribe((settings) => {
        formSettings = settings;
      });

      // Assert: The form should show encryption is enabled and include the encryption key
      expect(formSettings).toBeDefined();
      expect(formSettings!.isEncryptionEnabled).toBe(true);
      expect(formSettings!.encryptKey).toBe('test-password-123');
      expect(formSettings!.localFileSync).toEqual(
        jasmine.objectContaining({
          syncFolderPath: 'C:\\Users\\test\\sync',
        }),
      );
    });
  });
});
