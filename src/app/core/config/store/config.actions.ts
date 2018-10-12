import { Action } from '@ngrx/store';
import { GlobalConfig } from '../config.model';
import { SectionConfig } from '../config.model';

export enum ConfigActionTypes {
  LoadConfig = '[Config] Load Config',
  UpdateConfig = '[Config] Update Config',
  UpdateConfigSection = '[Config] Update Config Section',
}

export class LoadConfig implements Action {
  readonly type = ConfigActionTypes.LoadConfig;

  constructor(public cfg: GlobalConfig) {
  }
}

export class UpdateConfigSection implements Action {
  readonly type = ConfigActionTypes.UpdateConfigSection;

  constructor(public sectionKey, public sectionCfg: Partial<SectionConfig>) {
  }
}

export type ConfigActions
  = LoadConfig
  | UpdateConfigSection;
