import { createAction, props } from '@ngrx/store';
import { GlobalConfigSectionKey, GlobalSectionConfig } from '../global-config.model';

export const updateGlobalConfigSection = createAction(
  '[Global Config] Update Global Config Section',
  props<{
    sectionKey: GlobalConfigSectionKey;
    sectionCfg: Partial<GlobalSectionConfig>;
    isSkipSnack?: boolean;
  }>(),
);
