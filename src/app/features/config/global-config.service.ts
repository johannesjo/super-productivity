import { Injectable, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { updateGlobalConfigSection } from './store/global-config.actions';
import { Observable } from 'rxjs';
import {
  EvaluationConfig,
  GlobalConfigSectionKey,
  GlobalConfigState,
  GlobalSectionConfig,
  IdleConfig,
  MiscConfig,
  ScheduleConfig,
  ShortSyntaxConfig,
  SoundConfig,
  SyncConfig,
  TakeABreakConfig,
} from './global-config.model';
import {
  selectConfigFeatureState,
  selectEvaluationConfig,
  selectIdleConfig,
  selectMiscConfig,
  selectShortSyntaxConfig,
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
  private readonly _store = inject<Store<any>>(Store);

  cfg$: Observable<GlobalConfigState>;

  misc$: Observable<MiscConfig> = this._store.pipe(
    select(selectMiscConfig),
    shareReplay(1),
  );

  shortSyntax$: Observable<ShortSyntaxConfig> = this._store.pipe(
    select(selectShortSyntaxConfig),
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

  timelineCfg$: Observable<ScheduleConfig> = this._store.pipe(
    select(selectTimelineConfig),
  );

  cfg?: GlobalConfigState;

  constructor() {
    this.cfg$ = this._store.pipe(
      select(selectConfigFeatureState),
      distinctUntilChanged(distinctUntilChangedObject),
      shareReplay(1),
    );
    this.cfg$.subscribe((cfg) => (this.cfg = cfg));
  }

  updateSection(
    sectionKey: GlobalConfigSectionKey,
    sectionCfg: Partial<GlobalSectionConfig>,
    isSkipSnack?: boolean,
  ): void {
    this._store.dispatch(
      updateGlobalConfigSection({
        sectionKey,
        sectionCfg,
        isSkipSnack,
      }),
    );
  }
}
