import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { select } from '@ngrx/store';
import { ConfigActionTypes } from './store/config.actions';
import { DEFAULT_CONFIG } from 'tslint/lib/configuration';
import { Observable } from 'rxjs';
import { GlobalConfig } from './config.model';
import { selectConfigFeatureState } from './store/config.reducer';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  cfg$: Observable<GlobalConfig> = this._store.pipe(select(selectConfigFeatureState));

  constructor(private readonly _store: Store<any>) {
    this.load();
    this.cfg$.subscribe((val) => console.log(val));

  }

  load() {
    // load project cfg
    this._store.dispatch({
      type: ConfigActionTypes.LoadConfig,
      payload: DEFAULT_CONFIG,
    });
  }

  updateItem(sectionKey, itemKey, value) {
    this._store.dispatch({
      type: ConfigActionTypes.LoadConfig,
      payload: {
        sectionKey,
        itemKey,
        value
      },
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
