import { Action } from '@ngrx/store';
import { ConfigSectionKey, GlobalConfig, SectionConfig } from '../config.model';

export enum ConfigActionTypes {
  LoadConfig = '[Config] Load Config',
  UpdateConfigSection = '[Config] Update Config Section',
}

export class LoadConfig implements Action {
  readonly type = ConfigActionTypes.LoadConfig;

  constructor(public payload: { cfg: GlobalConfig, isOmitTokens: boolean }) {
  }
}

export class UpdateConfigSection implements Action {
  readonly type = ConfigActionTypes.UpdateConfigSection;

  constructor(public payload: {
    sectionKey: ConfigSectionKey
    sectionCfg: Partial<SectionConfig>,
    isSkipLastActive: boolean,
  }) {
  }
}

export type ConfigActions
  = LoadConfig
  | UpdateConfigSection;
