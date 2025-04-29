import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { combineLatest, Observable } from 'rxjs';
import { SyncConfig } from '../../features/config/global-config.model';
import { map, tap } from 'rxjs/operators';
import { PrivateCfgByProviderId, SyncProviderId } from '../../pfapi/api';
import { DEFAULT_GLOBAL_CONFIG } from '../../features/config/default-global-config.const';

const PROP_MAP_TO_FORM: Record<SyncProviderId, keyof SyncConfig | null> = {
  [SyncProviderId.LocalFile]: 'localFileSync',
  [SyncProviderId.WebDAV]: 'webDav',
  [SyncProviderId.Dropbox]: null,
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
    map(([syncCfg, currentProviderCfg]) => {
      // Base config with defaults
      const baseConfig = {
        ...DEFAULT_GLOBAL_CONFIG.sync,
        ...syncCfg,
      };

      // If no provider is active, return base config with empty encryption key
      if (!currentProviderCfg) {
        return {
          ...baseConfig,
          encryptKey: '',
        };
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

      return result;
    }),
    tap((v) => console.log('syncSettingsForm$', v)),
  );

  async updateEncryptionPassword(
    pwd: string,
    syncProviderId?: SyncProviderId,
  ): Promise<void> {
    const activeProvider = syncProviderId
      ? await this._pfapiService.pf.getSyncProviderById(syncProviderId)
      : this._pfapiService.pf.getActiveSyncProvider();
    if (!activeProvider) {
      throw new Error('No active sync provider');
    }
    const oldConfig = await activeProvider.privateCfg.load();

    await this._pfapiService.pf.setPrivateCfgForSyncProvider(activeProvider.id, {
      ...oldConfig,
      encryptKey: pwd,
    } as PrivateCfgByProviderId<SyncProviderId>);
  }

  async updateSettingsFromForm(newSettings: SyncConfig, isForce = false): Promise<void> {
    // TODO this is just a work around for formly ending in a endless loop otherwise
    // Prevent unnecessary updates
    const isEqual = JSON.stringify(this._lastSettings) === JSON.stringify(newSettings);
    if (isEqual && !isForce) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptKey, webDav, localFileSync, ...newSettingsClean } = newSettings;

    const providerId = newSettingsClean.syncProvider as SyncProviderId | null;
    if (providerId && this._lastSettings?.encryptKey !== newSettings.encryptKey) {
      await this.updateEncryptionPassword(newSettings.encryptKey || '', providerId);
    }
    this._lastSettings = newSettings;

    // Update global config
    this._globalConfigService.updateSection('sync', newSettingsClean);

    if (!providerId) {
      return;
    }
    const prop = PROP_MAP_TO_FORM[providerId];
    if (!prop) {
      return;
    }

    // Update provider-specific config
    if (typeof newSettings[prop] !== 'object' || newSettings[prop] === null) {
      throw new Error('Invalid mapping for privateCfg for sync provider');
    }

    const privateCfg = { ...newSettings[prop], encryptKey };

    // Handle WebDAV provider specially
    if (providerId === SyncProviderId.WebDAV) {
      const webDavCfg = privateCfg as PrivateCfgByProviderId<SyncProviderId.WebDAV>;
      await this._pfapiService.pf.setPrivateCfgForSyncProvider(providerId, {
        ...webDavCfg,
        baseUrl: webDavCfg.baseUrl || '',
        userName: webDavCfg.userName || '',
        password: webDavCfg.password || '',
        syncFolderPath: webDavCfg.syncFolderPath || '',
      });
    } else {
      await this._pfapiService.pf.setPrivateCfgForSyncProvider(
        providerId,
        privateCfg as PrivateCfgByProviderId<SyncProviderId>,
      );
    }
  }
}
