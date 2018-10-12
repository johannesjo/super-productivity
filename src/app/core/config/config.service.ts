import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { select } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { Observable } from 'rxjs';
import { GlobalConfig } from './config.model';
import { selectConfigFeatureState } from './store/config.reducer';
import { DEFAULT_CFG } from './default-config.const';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  cfg$: Observable<GlobalConfig> = this._store.pipe(select(selectConfigFeatureState));

  constructor(private readonly _store: Store<any>) {
    this.load();
    this.cfg$.subscribe((val) => console.log('SUB', val));

  }

  load() {
    // load project cfg
    this._store.dispatch({
      type: ConfigActionTypes.LoadConfig,
      payload: DEFAULT_CFG,
    });
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
