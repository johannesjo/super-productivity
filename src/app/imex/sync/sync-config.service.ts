import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { combineLatest, from, Observable, of } from 'rxjs';
import { SyncConfig } from '../../features/config/global-config.model';
import { switchMap, tap } from 'rxjs/operators';
import { PrivateCfgByProviderId, SyncProviderId } from '../../pfapi/api';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';
import { SyncLog } from '../../core/log';
import { environment } from '../../../environments/environment';

// Maps sync providers to their corresponding form field in SyncConfig
// Dropbox is null because it doesn't store settings in the form (uses OAuth)
const PROP_MAP_TO_FORM: Record<SyncProviderId, keyof SyncConfig | null> = {
  [SyncProviderId.LocalFile]: 'localFileSync',
  [SyncProviderId.WebDAV]: 'webDav',
  [SyncProviderId.Dropbox]: null,
};

// Ensures all required fields have empty string defaults to prevent undefined/null errors
// when providers expect string values (e.g., WebDAV API calls fail with undefined URLs)
const PROVIDER_FIELD_DEFAULTS: Record<SyncProviderId, Record<string, string>> = {
  [SyncProviderId.WebDAV]: {
    baseUrl: '',
    userName: '',
    password: '',
    syncFolderPath: '',
    encryptKey: '',
  },
  [SyncProviderId.LocalFile]: {
    syncFolderPath: '',
    encryptKey: '',
  },
  [SyncProviderId.Dropbox]: {
    encryptKey: '',
  },
};

@Injectable({
  providedIn: 'root',
})
export class SyncConfigService {
  private _pfapiService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);

  private _lastSettings: SyncConfig | null = null;

  readonly syncSettingsForm$: Observable<SyncConfig> = combineLatest([
    this._globalConfigService.sync$,
    this._pfapiService.currentProviderPrivateCfg$,
  ]).pipe(
    switchMap(([syncCfg, currentProviderCfg]) => {
      // Base config with defaults
      const baseConfig = {
        ...DEFAULT_GLOBAL_CONFIG.sync,
        ...syncCfg,
      };

      // If no provider is active, return base config with empty encryption key
      if (!currentProviderCfg) {
        return from(
          fetch('/assets/sync-config-default-override.json')
            .then((res) => res.json())
            .then((defaultOverride) => {
              return {
                ...baseConfig,
                ...defaultOverride,
                webDav: {
                  ...baseConfig.webDav,
                  ...defaultOverride.webDav,
                },
                encryptKey: '',
              };
            })
            .catch(() => {
              return {
                ...baseConfig,
                encryptKey: '',
              };
            }),
        );
      }

      const prop = PROP_MAP_TO_FORM[currentProviderCfg.providerId];

      // Create config with provider-specific settings
      const result = {
        ...baseConfig,
        encryptKey: currentProviderCfg?.privateCfg?.encryptKey || '',
        // Reset provider-specific configs to defaults first
        localFileSync: DEFAULT_GLOBAL_CONFIG.sync.localFileSync,
        webDav: DEFAULT_GLOBAL_CONFIG.sync.webDav,
      };

      // Add current provider config if applicable
      if (prop && currentProviderCfg.privateCfg) {
        result[prop] = currentProviderCfg.privateCfg;
      }

      return of(result);
    }),
    // NOTE: DO NOT LOG - contains passwords and encryption keys in production
    tap((v) => SyncLog.log('syncSettingsForm$', environment.production ? typeof v : v)),
  );

  async updateEncryptionPassword(
    pwd: string,
    syncProviderId?: SyncProviderId,
  ): Promise<void> {
    const activeProvider = syncProviderId
      ? await this._pfapiService.pf.getSyncProviderById(syncProviderId)
      : this._pfapiService.pf.getActiveSyncProvider();
    if (!activeProvider) {
      // During initial sync setup, no provider exists yet to store the key.
      // The key will be saved when the user completes provider configuration.
      SyncLog.err(
        'No active sync provider found when trying to update encryption password',
      );
      return;
    }
    const oldConfig = await activeProvider.privateCfg.load();

    await this._pfapiService.pf.setPrivateCfgForSyncProvider(activeProvider.id, {
      ...oldConfig,
      encryptKey: pwd,
    } as PrivateCfgByProviderId<SyncProviderId>);
  }

  async updateSettingsFromForm(newSettings: SyncConfig, isForce = false): Promise<void> {
    // Formly can trigger multiple updates for a single user action, causing sync conflicts
    // and unnecessary API calls. This check prevents duplicate saves.
    const isEqual = JSON.stringify(this._lastSettings) === JSON.stringify(newSettings);
    if (isEqual && !isForce) {
      return;
    }
    this._lastSettings = newSettings;

    const providerId = newSettings.syncProvider as SyncProviderId | null;

    // Split settings into public (global config) and private (credentials/secrets)
    // to maintain security boundaries - credentials never go to global config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptKey, webDav, localFileSync, ...globalConfig } = newSettings;
    this._globalConfigService.updateSection('sync', globalConfig);

    // Provider-specific settings (URLs, credentials) must be stored securely
    if (providerId) {
      await this._updatePrivateConfig(providerId, newSettings);
    }
  }

  private async _updatePrivateConfig(
    providerId: SyncProviderId,
    settings: SyncConfig,
  ): Promise<void> {
    const prop = PROP_MAP_TO_FORM[providerId];

    // Load existing config to preserve OAuth tokens and other settings
    const activeProvider = await this._pfapiService.pf.getSyncProviderById(providerId);
    const oldConfig = activeProvider ? await activeProvider.privateCfg.load() : {};

    // Form fields contain provider-specific settings, but Dropbox uses OAuth tokens
    // stored elsewhere, so it only needs the encryption key
    const privateConfigProviderSpecific = prop ? settings[prop] || {} : {};

    // Start with defaults to ensure API calls won't fail due to undefined values,
    // then overlay old config to preserve existing data (like OAuth tokens),
    // then overlay user settings, and always include encryption key for data security
    // NOTE: that we need the old config here in order not to overwrite other private stuff like tokens
    const configWithDefaults = {
      ...PROVIDER_FIELD_DEFAULTS[providerId],
      ...oldConfig,
      ...(privateConfigProviderSpecific as Record<string, unknown>),
      encryptKey: settings.encryptKey || '',
    };

    await this._pfapiService.pf.setPrivateCfgForSyncProvider(
      providerId,
      configWithDefaults as PrivateCfgByProviderId<SyncProviderId>,
    );
  }
}
