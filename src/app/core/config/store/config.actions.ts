import { Action } from '@ngrx/store';

export enum ConfigActionTypes {
  LoadConfigs = '[Config] Load Configs'
}

export class LoadConfig implements Action {
  readonly type = ConfigActionTypes.LoadConfig;
}

export class UpdateConfig implements Action {
  readonly type = ConfigActionTypes.UpdateConfig;
}

export type ConfigActions = LoadConfig;
