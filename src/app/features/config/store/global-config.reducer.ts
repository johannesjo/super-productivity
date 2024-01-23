import { updateGlobalConfigSection } from './global-config.actions';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import {
  CalendarProvider,
  DominaModeConfig,
  EvaluationConfig,
  FocusModeConfig,
  GlobalConfigState,
  IdleConfig,
  MiscConfig,
  PomodoroConfig,
  ReminderConfig,
  SoundConfig,
  SyncConfig,
  TakeABreakConfig,
  TimelineConfig,
} from '../global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from '../default-global-config.const';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateGlobalConfigState } from '../migrate-global-config.util';
import { MODEL_VERSION_KEY } from '../../../app.constants';
import { MODEL_VERSION } from '../../../core/model-version';

export const CONFIG_FEATURE_NAME = 'globalConfig';
export const selectConfigFeatureState =
  createFeatureSelector<GlobalConfigState>(CONFIG_FEATURE_NAME);
export const selectMiscConfig = createSelector(
  selectConfigFeatureState,
  (cfg): MiscConfig => cfg.misc,
);
export const selectSoundConfig = createSelector(
  selectConfigFeatureState,
  (cfg): SoundConfig => cfg.sound,
);
export const selectEvaluationConfig = createSelector(
  selectConfigFeatureState,
  (cfg): EvaluationConfig => cfg.evaluation,
);
export const selectIdleConfig = createSelector(
  selectConfigFeatureState,
  (cfg): IdleConfig => cfg.idle,
);
export const selectSyncConfig = createSelector(
  selectConfigFeatureState,
  (cfg): SyncConfig => cfg.sync,
);
export const selectTakeABreakConfig = createSelector(
  selectConfigFeatureState,
  (cfg): TakeABreakConfig => cfg.takeABreak,
);
export const selectTimelineConfig = createSelector(
  selectConfigFeatureState,
  (cfg): TimelineConfig => cfg.timeline,
);

export const selectIsDominaModeConfig = createSelector(
  selectConfigFeatureState,
  (cfg): DominaModeConfig => cfg.dominaMode,
);

export const selectFocusModeConfig = createSelector(
  selectConfigFeatureState,
  (cfg): FocusModeConfig => cfg.focusMode,
);
export const selectPomodoroConfig = createSelector(
  selectConfigFeatureState,
  (cfg): PomodoroConfig => cfg.pomodoro,
);
export const selectIsPomodoroEnabled = createSelector(
  selectConfigFeatureState,
  (cfg): boolean => cfg.pomodoro.isEnabled,
);
export const selectReminderConfig = createSelector(
  selectConfigFeatureState,
  (cfg): ReminderConfig => cfg.reminder,
);

export const selectCalendarProviders = createSelector(
  selectConfigFeatureState,
  (cfg): CalendarProvider[] => cfg.calendarIntegration.calendarProviders,
);

export const selectCalendarProviderById = createSelector(
  selectCalendarProviders,
  (calProviders, props: { id: string }): CalendarProvider | undefined =>
    calProviders.find((calProvider) => calProvider.id === props.id),
);

export const initialGlobalConfigState: GlobalConfigState = {
  ...DEFAULT_GLOBAL_CONFIG,
  [MODEL_VERSION_KEY]: MODEL_VERSION.GLOBAL_CONFIG,
};

export const globalConfigReducer = createReducer<GlobalConfigState>(
  initialGlobalConfigState,

  on(loadAllData, (oldState, { appDataComplete }) =>
    appDataComplete.globalConfig
      ? migrateGlobalConfigState({ ...appDataComplete.globalConfig })
      : oldState,
  ),

  on(updateGlobalConfigSection, (state, { sectionKey, sectionCfg }) => ({
    ...state,
    [sectionKey]: {
      // @ts-ignore
      ...state[sectionKey],
      ...sectionCfg,
    },
  })),
);
