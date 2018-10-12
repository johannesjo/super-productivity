import { ConfigActions, ConfigActionTypes } from './config.actions';
import { createFeatureSelector } from '@ngrx/store';
import { GlobalConfig } from '../config.model';
import { DEFAULT_CFG } from '../default-config.const';

export const CONFIG_FEATURE_NAME = 'globalConfig';
export const selectConfigFeatureState = createFeatureSelector<GlobalConfig>(CONFIG_FEATURE_NAME);


export const initialState: GlobalConfig = DEFAULT_CFG;

export function configReducer(
  state = initialState,
  action: ConfigActions
): GlobalConfig {
  console.log(action, state);

  switch (action.type) {
    case ConfigActionTypes.LoadConfig:
      return Object.assign({}, action.payload);

    case ConfigActionTypes.UpdateConfigSection:
      const newState = Object.assign({}, state);
      newState[action.payload.sectionKey] = Object.assign(newState[action.payload.sectionKey], action.payload.sectionCfg);
      return newState;

    default:
      return state;
  }
}
