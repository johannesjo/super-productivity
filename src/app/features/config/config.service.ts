import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { Observable } from 'rxjs';
import { ConfigSectionKey, GlobalConfig, GoogleSession, MiscConfig, SectionConfig } from './config.model';
import { selectConfigFeatureState, selectGoogleSession, selectMiscConfig } from './store/config.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { DEFAULT_CFG } from './default-config.const';
import { Actions, ofType } from '@ngrx/effects';
import { distinctUntilChanged, shareReplay, skip } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  cfg$: Observable<GlobalConfig> = this._store.pipe(
    select(selectConfigFeatureState),
    distinctUntilChanged(),
    shareReplay(),
  );

  misc$: Observable<MiscConfig> = this._store.pipe(
    select(selectMiscConfig),
    distinctUntilChanged(),
    shareReplay(),
  );

  googleSession$: Observable<GoogleSession> = this._store.pipe(
    select(selectGoogleSession),
    distinctUntilChanged(),
  );

  cfg: GlobalConfig;

  onCfgLoaded$: Observable<any> = this._actions$.pipe(ofType(ConfigActionTypes.LoadConfig));

  constructor(
    private readonly _store: Store<any>,
    private readonly _actions$: Actions,
    private readonly _persistenceService: PersistenceService
  ) {
    // this.cfg$.subscribe((val) => console.log(val));
    this.cfg$.subscribe((cfg) => this.cfg = cfg);
    this.load();
  }

  async load(isOmitTokens = false) {
    const cfg = await this._persistenceService.loadGlobalConfig();
    if (cfg && Object.keys(cfg).length > 0) {
      this.loadState(cfg, isOmitTokens);
    } else {
      // NOTE: this happens if there never have been any changes to the default cfg
      console.warn('ConfigService No config found in ls');
    }
  }

  loadState(state: GlobalConfig, isOmitTokens = false) {
    this._store.dispatch({
      type: ConfigActionTypes.LoadConfig,
      // always extend default config
      payload: {
        cfg: {...DEFAULT_CFG, ...state},
        isOmitTokens
      },
    });
  }

  updateSection(sectionKey: ConfigSectionKey, sectionCfg: Partial<SectionConfig>, isSkipLastActive = false) {
    this._store.dispatch({
      type: ConfigActionTypes.UpdateConfigSection,
      payload: {
        sectionKey,
        sectionCfg,
        isSkipLastActive,
      },
    });
  }
}
