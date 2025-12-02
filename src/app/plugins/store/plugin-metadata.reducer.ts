import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { loadAllData } from '../../root-store/meta/load-all-data.action';
import {
  initialPluginMetaDataState,
  PluginMetaDataState,
} from '../plugin-persistence.model';

export const PLUGIN_METADATA_FEATURE_NAME = 'pluginMetadata';

export const pluginMetadataReducer = createReducer(
  initialPluginMetaDataState,
  on(
    loadAllData,
    (_state, { appDataComplete }) =>
      (appDataComplete as { pluginMetadata?: PluginMetaDataState }).pluginMetadata ??
      initialPluginMetaDataState,
  ),
);

export const selectPluginMetadataFeatureState =
  createFeatureSelector<PluginMetaDataState>(PLUGIN_METADATA_FEATURE_NAME);
