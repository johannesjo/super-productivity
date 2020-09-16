import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { GlobalConfigActionTypes } from './store/global-config.actions';
import { Observable } from 'rxjs';
import {
  EvaluationConfig,
  GlobalConfigSectionKey,
  GlobalConfigState,
  GlobalSectionConfig,
  GoogleDriveSyncConfig,
  IdleConfig,
  MiscConfig,
  SoundConfig,
  TakeABreakConfig
} from './global-config.model';
import {
  selectConfigFeatureState,
  selectEvaluationConfig,
  selectGoogleDriveSyncConfig,
  selectIdleConfig,
  selectMiscConfig,
  selectSoundConfig,
  selectTakeABreakConfig
} from './store/global-config.reducer';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { distinctUntilChangedObject } from '../../util/distinct-until-changed-object';

@Injectable({
  providedIn: 'root',
})
export class GlobalConfigService {
  cfg$: Observable<GlobalConfigState> = this._store.pipe(
    select(selectConfigFeatureState),
    distinctUntilChanged(distinctUntilChangedObject),
    shareReplay(1),
  );

  googleDriveSyncCfg$: Observable<GoogleDriveSyncConfig> = this._store.pipe(
    select(selectGoogleDriveSyncConfig),
    shareReplay(1),
  );

  misc$: Observable<MiscConfig> = this._store.pipe(
    select(selectMiscConfig),
    shareReplay(1),
  );

  sound$: Observable<SoundConfig> = this._store.pipe(
    select(selectSoundConfig),
    shareReplay(1),
  );

  evaluation$: Observable<EvaluationConfig> = this._store.pipe(
    select(selectEvaluationConfig),
  );

  idle$: Observable<IdleConfig> = this._store.pipe(
    select(selectIdleConfig),
    shareReplay(1),
  );

  takeABreak$: Observable<TakeABreakConfig> = this._store.pipe(
    select(selectTakeABreakConfig),
    shareReplay(1),
  );

  cfg?: GlobalConfigState;

  constructor(
    private readonly _store: Store<any>,
  ) {
    // this.cfg$.subscribe((val) => console.log(val));
    this.cfg$.subscribe((cfg) => this.cfg = cfg);
  }

  updateSection(sectionKey: GlobalConfigSectionKey, sectionCfg: Partial<GlobalSectionConfig>) {
    this._store.dispatch({
      type: GlobalConfigActionTypes.UpdateGlobalConfigSection,
      payload: {
        sectionKey,
        sectionCfg,
      },
    });
  }
}
