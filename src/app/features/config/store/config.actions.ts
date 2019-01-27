import { Action } from '@ngrx/store';
import { GlobalConfig, SectionConfig } from '../config.model';

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
    sectionKey: string
    sectionCfg: Partial<SectionConfig>,
    isSkipLastActive: boolean,
  }) {
  }
}

export type ConfigActions
  = LoadConfig
  | UpdateConfigSection;
