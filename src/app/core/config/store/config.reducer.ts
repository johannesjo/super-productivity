import { ConfigActions, ConfigActionTypes } from './config.actions';
import { createFeatureSelector } from '@ngrx/store';
import { GlobalConfig } from '../config.model';

export const CONFIG_FEATURE_NAME = 'globalConfig';
export const selectConfigFeatureState = createFeatureSelector<GlobalConfig>(CONFIG_FEATURE_NAME);



export const initialState: GlobalConfig = null;

export function reducer(
  state = initialState,
  action: ConfigActions
): GlobalConfig {
  switch (action.type) {

    case ConfigActionTypes.LoadConfig:
      return Object.assign({}, action.cfg);

    case ConfigActionTypes.UpdateConfigSection:
      const newState = Object.assign({}, state);
      newState[action.sectionKey] = Object.assign(newState[action.sectionKey], action.sectionCfg);
      return newState;

    default:
      return state;
  }
}
