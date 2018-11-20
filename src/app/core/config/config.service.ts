import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { Observable } from 'rxjs';
import { ConfigSectionKey, GlobalConfig, SectionConfig } from './config.model';
import { selectConfigFeatureState } from './store/config.reducer';
import { PersistenceService } from '../persistence/persistence.service';
import { DEFAULT_CFG } from './default-config.const';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public cfg$: Observable<GlobalConfig> = this._store.pipe(select(selectConfigFeatureState));
  public cfg: GlobalConfig;

  constructor(
    private readonly _store: Store<any>,
    private readonly _persistenceService: PersistenceService
  ) {
    this.load();
    // this.cfg$.subscribe((val) => console.log(val));
    this.cfg$.subscribe((cfg) => this.cfg = cfg);
  }

  load() {
    const cfg = this._persistenceService.loadGlobalConfig();
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

  updateSection(sectionKey: ConfigSectionKey, sectionCfg: Partial<SectionConfig>) {
    this._store.dispatch({
      type: ConfigActionTypes.UpdateConfigSection,
      payload: {
        sectionKey,
        sectionCfg
      },
    });
  }
}
