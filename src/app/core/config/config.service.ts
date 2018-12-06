import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { Observable } from 'rxjs';
import { ConfigSectionKey, GlobalConfig, SectionConfig } from './config.model';
import { selectConfigFeatureState } from './store/config.reducer';
import { PersistenceService } from '../persistence/persistence.service';
import { DEFAULT_CFG } from './default-config.const';
import { Actions, ofType } from '@ngrx/effects';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  cfg$: Observable<GlobalConfig> = this._store.pipe(select(selectConfigFeatureState));
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

  async load() {
    const cfg = await this._persistenceService.loadGlobalConfig();

    if (cfg && Object.keys(cfg).length > 0) {
      this.loadState(cfg);
    } else {
      console.log('ConfigService No config found in ls');
    }
  }

  loadState(state: GlobalConfig) {
    this._store.dispatch({
      type: ConfigActionTypes.LoadConfig,
      // always extend default config
      payload: {...DEFAULT_CFG, ...state},
    });
  }

  updateSection(sectionKey: ConfigSectionKey, sectionCfg: Partial<SectionConfig>, isSkipLastActiveUpdated = false) {
    this._store.dispatch({
      type: ConfigActionTypes.UpdateConfigSection,
      payload: {
        sectionKey,
        sectionCfg,
        isSkipLastActiveUpdated,
      },
    });
  }
}
