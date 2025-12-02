import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import {
  initialPluginUserDataState,
  PluginUserDataState,
} from '../plugin-persistence.model';

export const PLUGIN_USER_DATA_FEATURE_NAME = 'pluginUserData';

export const pluginUserDataReducer = createReducer(
  initialPluginUserDataState,
  on(
    loadAllData,
    (_state, { appDataComplete }) =>
      (appDataComplete as { pluginUserData?: PluginUserDataState }).pluginUserData ??
      initialPluginUserDataState,
  ),
);

export const selectPluginUserDataFeatureState =
  createFeatureSelector<PluginUserDataState>(PLUGIN_USER_DATA_FEATURE_NAME);
