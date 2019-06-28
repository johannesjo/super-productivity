import { Action } from '@ngrx/store';
import { GlobalConfigSectionKey, GlobalConfigState, GlobalSectionConfig } from '../global-config.model';

export enum GlobalConfigActionTypes {
  LoadGlobalConfig = '[Global Config] Load Global Config',
  UpdateGlobalConfigSection = '[Global Config] Update Global Config Section',
}

export class LoadGlobalConfig implements Action {
  readonly type = GlobalConfigActionTypes.LoadGlobalConfig;

  constructor(public payload: { cfg: GlobalConfigState, isOmitTokens: boolean }) {
  }
}

export class UpdateGlobalConfigSection implements Action {
  readonly type = GlobalConfigActionTypes.UpdateGlobalConfigSection;

  constructor(public payload: {
    sectionKey: GlobalConfigSectionKey
    sectionCfg: Partial<GlobalSectionConfig>,
    isSkipLastActive: boolean,
  }) {
  }
}

export type GlobalConfigActions
  = LoadGlobalConfig
  | UpdateGlobalConfigSection;
