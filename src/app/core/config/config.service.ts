import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { Observable } from 'rxjs';
import { GlobalConfig } from './config.model';
import { selectConfigFeatureState } from './store/config.reducer';
import { PersistenceService } from '../persistence/persistence.service';

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
      this._store.dispatch({
        type: ConfigActionTypes.LoadConfig,
        payload: cfg,
      });
    } else {
      console.log('ConfigService No config found in ls');
    }
  }

  updateSection(sectionKey, sectionCfg) {
    this._store.dispatch({
      type: ConfigActionTypes.UpdateConfigSection,
      payload: {
        sectionKey,
        sectionCfg
      },
    });
  }
}
