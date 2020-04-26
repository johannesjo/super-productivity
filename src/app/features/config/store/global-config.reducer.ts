import {GlobalConfigActions, GlobalConfigActionTypes} from './global-config.actions';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {
  EvaluationConfig,
  GlobalConfigState,
  GoogleDriveSyncConfig,
  IdleConfig,
  MiscConfig,
  TakeABreakConfig
} from '../global-config.model';
import {DEFAULT_GLOBAL_CONFIG} from '../default-global-config.const';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';
import {AppDataComplete} from '../../../imex/sync/sync.model';

export const CONFIG_FEATURE_NAME = 'globalConfig';
export const selectConfigFeatureState = createFeatureSelector<GlobalConfigState>(CONFIG_FEATURE_NAME);
export const selectMiscConfig = createSelector(selectConfigFeatureState, (cfg): MiscConfig => cfg.misc);
export const selectEvaluationConfig = createSelector(selectConfigFeatureState, (cfg): EvaluationConfig => cfg.evaluation);
export const selectGoogleDriveSyncConfig = createSelector(selectConfigFeatureState, (cfg): GoogleDriveSyncConfig => cfg.googleDriveSync);
export const selectIdleConfig = createSelector(selectConfigFeatureState, (cfg): IdleConfig => cfg.idle);
export const selectTakeABreakConfig = createSelector(selectConfigFeatureState, (cfg): TakeABreakConfig => cfg.takeABreak);
export const selectGoogleSession = createSelector(selectConfigFeatureState, (cfg) => cfg._googleSession);

export const initialState: GlobalConfigState = DEFAULT_GLOBAL_CONFIG;

export function globalConfigReducer(
  state = initialState,
  action: GlobalConfigActions
): GlobalConfigState {
  // console.log(action, state);

  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadDataComplete.type) {
    const {appDataComplete}: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.globalConfig
      ? {...appDataComplete.globalConfig}
      : state;
  }

  switch (action.type) {
    case GlobalConfigActionTypes.LoadGlobalConfig: {
      const {cfg, isOmitTokens} = action.payload;
      if (isOmitTokens) {
        const currentGoogleSession = state._googleSession
          ? state._googleSession
          : {};

        return {
          ...cfg,
          _googleSession: {
            ...cfg._googleSession,
            ...currentGoogleSession
          },
        };
      } else {
        return {
          ...cfg
        };
      }
    }

    case GlobalConfigActionTypes.UpdateGlobalConfigSection:
      const {sectionKey, sectionCfg} = action.payload;
      return {
        ...state,
        [sectionKey]: {
          ...state[sectionKey],
          ...sectionCfg
        }
      };

    default:
      return state;
  }
}
