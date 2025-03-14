import { PfapiModelCfgToModelCtrl } from './pfapi';
import { PFAPIModelCfgs } from './pfapi.model';
import { PFAPIModelCtrl } from './pfapi-model-ctrl';

interface PFAPIGroupMap {
  [groupId: string]: PFAPIModelCtrl<unknown>[]; // modelIds
}

export class PFAPISyncDataService<const MD extends PFAPIModelCfgs> {
  public readonly m: PfapiModelCfgToModelCtrl<MD>;

  private _groupMap: PFAPIGroupMap;
  private _singleModels: PFAPIModelCtrl<unknown>[];

  constructor(m: PfapiModelCfgToModelCtrl<MD>) {
    this.m = m;
    const { groups, singleModels } = this._getModelGroups();
    this._groupMap = groups;
    this._singleModels = singleModels;
  }

  // TODO type
  async getCompleteSyncData(): Promise<any> {}

  // TODO type
  async importCompleteSyncData(): Promise<any> {}

  // TODO type
  async importPartialSyncData(): Promise<any> {}

  // TODO type
  // TODO migrations

  private _getModelGroups(): {
    groups: PFAPIGroupMap;
    singleModels: PFAPIModelCtrl<unknown>[];
  } {
    const groupMap: PFAPIGroupMap = {};
    const singleModels: PFAPIModelCtrl<unknown>[] = [];
    Object.keys(this.m).map((modelId) => {
      const entry = this.m[modelId];
      if (entry.modelCfg.modelFileGroup) {
        if (!groupMap[entry.modelCfg.modelFileGroup]) {
          groupMap[entry.modelCfg.modelFileGroup] = [];
        }
        groupMap[entry.modelCfg.modelFileGroup].push(entry);
      } else {
        singleModels.push(entry);
      }
    });

    return { groups: groupMap, singleModels: singleModels };
  }
}
