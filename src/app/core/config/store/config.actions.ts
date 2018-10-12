import { Action } from '@ngrx/store';

export enum ConfigActionTypes {
  LoadConfigs = '[Config] Load Configs'
}

export class LoadConfigs implements Action {
  readonly type = ConfigActionTypes.LoadConfigs;
}

export type ConfigActions = LoadConfigs;
