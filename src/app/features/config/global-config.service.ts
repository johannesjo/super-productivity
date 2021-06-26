import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { GlobalConfigActionTypes } from './store/global-config.actions';
import { Observable } from 'rxjs';
import {
  EvaluationConfig,
  GlobalConfigSectionKey,
  GlobalConfigState,
  GlobalSectionConfig,
  IdleConfig,
  MiscConfig,
  SoundConfig,
  SyncConfig,
  TakeABreakConfig,
  TimelineConfig,
} from './global-config.model';
import {
  selectConfigFeatureState,
  selectEvaluationConfig,
  selectIdleConfig,
  selectMiscConfig,
  selectSoundConfig,
  selectSyncConfig,
  selectTakeABreakConfig,
  selectTimelineConfig,
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

  sync$: Observable<SyncConfig> = this._store.pipe(
    select(selectSyncConfig),
    shareReplay(1),
  );

  takeABreak$: Observable<TakeABreakConfig> = this._store.pipe(
    select(selectTakeABreakConfig),
    shareReplay(1),
  );

  timelineCfg$: Observable<TimelineConfig> = this._store.pipe(
    select(selectTimelineConfig),
  );

  cfg?: GlobalConfigState;

  constructor(private readonly _store: Store<any>) {
    this.cfg$.subscribe((cfg) => (this.cfg = cfg));
  }

  updateSection(
    sectionKey: GlobalConfigSectionKey,
    sectionCfg: Partial<GlobalSectionConfig>,
  ) {
    this._store.dispatch({
      type: GlobalConfigActionTypes.UpdateGlobalConfigSection,
      payload: {
        sectionKey,
        sectionCfg,
      },
    });
  }
}
