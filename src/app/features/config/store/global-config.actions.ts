import { Action } from '@ngrx/store';
import { GlobalConfigSectionKey, GlobalSectionConfig } from '../global-config.model';

export enum GlobalConfigActionTypes {
  'UpdateGlobalConfigSection' = '[Global Config] Update Global Config Section',
}

export class UpdateGlobalConfigSection implements Action {
  readonly type: string = GlobalConfigActionTypes.UpdateGlobalConfigSection;

  constructor(
    public payload: {
      sectionKey: GlobalConfigSectionKey;
      sectionCfg: Partial<GlobalSectionConfig>;
    },
  ) {}
}

export type GlobalConfigActions = UpdateGlobalConfigSection;
