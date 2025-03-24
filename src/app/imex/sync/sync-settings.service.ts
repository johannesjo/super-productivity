import { inject, Injectable } from '@angular/core';
import { PfapiService } from '../../pfapi/pfapi.service';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { combineLatest, Observable } from 'rxjs';
import { SyncConfig } from '../../features/config/global-config.model';
import { map } from 'rxjs/operators';
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
export class SyncSettingsService {
  private _pfapiService = inject(PfapiService);
  private _globalConfigService = inject(GlobalConfigService);

  private _lastSettings: SyncConfig | null = null;

  readonly syncSettingsForm$: Observable<SyncConfig> = combineLatest([
    this._globalConfigService.sync$,
    this._pfapiService.currentProviderPrivateCfg$,
  ]).pipe(
    map(([syncCfg, currentProviderCfg]) => {
      if (!currentProviderCfg) {
        // TODO ?
        return syncCfg;
      }
      const prop = PROP_MAP_TO_FORM[currentProviderCfg.providerId];
      if (!prop) {
        return syncCfg;
      }
      return {
        ...syncCfg,
        localFileSync: DEFAULT_GLOBAL_CONFIG.sync.localFileSync,
        webDav: DEFAULT_GLOBAL_CONFIG.sync.webDav,
        [prop]: currentProviderCfg.privateCfg,
      };
    }),
  );

  updateSettingsFromForm(newSettings: SyncConfig): void {
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
    console.log(providerId, prop, newSettings);
    const privateCfg = newSettings[prop];
    if (typeof privateCfg !== 'object') {
      throw new Error('Invalid mapping for privateCfg for sync provider');
    }
    this._pfapiService.setPrivateCfgForActiveProvider(providerId, privateCfg as any);
    console.log({
      ...newSettings,
      [prop]: DEFAULT_GLOBAL_CONFIG.sync[prop],
    });
    this._globalConfigService.updateSection('sync', {
      ...newSettings,
      [prop]: DEFAULT_GLOBAL_CONFIG.sync[prop],
    });
  }
}
