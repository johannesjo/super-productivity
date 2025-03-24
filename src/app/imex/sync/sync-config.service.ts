import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { combineLatest, Observable } from 'rxjs';
import { SyncConfig } from '../../features/config/global-config.model';
import { first, map, tap } from 'rxjs/operators';
import { SyncProviderId } from '../../pfapi/api';
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
      console.log({ syncCfg }, syncCfg.encryptionPassword);

      // TODO ???
      if (!currentProviderCfg) {
        return {
          ...DEFAULT_GLOBAL_CONFIG.sync,
          ...syncCfg,
        };
      }

      const prop = PROP_MAP_TO_FORM[currentProviderCfg.providerId];
      console.log({ prop });

      if (!prop) {
        return {
          ...DEFAULT_GLOBAL_CONFIG.sync,
          ...syncCfg,
        };
      }
      return {
        ...DEFAULT_GLOBAL_CONFIG.sync,
        ...syncCfg,
        localFileSync: DEFAULT_GLOBAL_CONFIG.sync.localFileSync,
        webDav: DEFAULT_GLOBAL_CONFIG.sync.webDav,
        [prop]: currentProviderCfg.privateCfg,
      };
    }),
    tap((v) => console.log('syncSettingsForm$', v)),
  );

  readonly syncSettingsFormOnce$: Observable<SyncConfig> =
    this.syncSettingsForm$.pipe(first());

  async updateSettingsFromForm(newSettings: SyncConfig, isForce = false): Promise<void> {
    // TODO this is just a work around for formly ending in a endless loop otherwise
    const isEqual = JSON.stringify(this._lastSettings) === JSON.stringify(newSettings);
    this._lastSettings = newSettings;
    if (isEqual && !isForce) {
      return;
    }
    alert('UPDATE');
    const providerId = newSettings.syncProvider as SyncProviderId | null;
    if (!providerId) {
      return this._globalConfigService.updateSection('sync', {
        ...newSettings,
      });
    }
    const prop = PROP_MAP_TO_FORM[providerId];
    if (!prop) {
      return this._globalConfigService.updateSection('sync', {
        ...newSettings,
      });
    }
    const privateCfg = newSettings[prop];
    if (typeof privateCfg !== 'object') {
      throw new Error('Invalid mapping for privateCfg for sync provider');
    }
    this._globalConfigService.updateSection('sync', {
      ...newSettings,
      [prop]: DEFAULT_GLOBAL_CONFIG.sync[prop],
    });
    await this._pfapiService.setPrivateCfgForSyncProvider(providerId, privateCfg as any);
  }
}
