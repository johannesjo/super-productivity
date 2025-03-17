import { PfapiModelCfgToModelCtrl } from './pf';
import { PFModelCfgs } from './pf.model';

// interface PFGroupMap {
//   [groupId: string]: PFModelCtrl<PFModelBase>[]; // modelIds
// }

export class PFSyncDataService<const MD extends PFModelCfgs> {
  public readonly m: PfapiModelCfgToModelCtrl<MD>;

  // private _groupMap: PFGroupMap;
  // private _singleModels: PFModelCtrl<PFModelBase>[];

  constructor(m: PfapiModelCfgToModelCtrl<MD>) {
    this.m = m;
    // const { groups, singleModels } = this._getModelGroups();
    // this._groupMap = groups;
    // this._singleModels = singleModels;
  }

  // TODO type
  async getCompleteSyncData(): Promise<any> {}

  // TODO type
  async importCompleteSyncData(): Promise<any> {}

  // TODO type
  async importPartialSyncData(): Promise<any> {}

  // TODO type
  // TODO migrations

  // private _getModelGroups(): {
  //   groups: PFGroupMap;
  //   singleModels: PFModelCtrl<PFModelBase>[];
  // } {
  //   const groupMap: PFGroupMap = {};
  //   const singleModels: PFModelCtrl<PFModelBase>[] = [];
  //   Object.keys(this.m).map((modelId) => {
  //     const entry = this.m[modelId];
  //     if (entry.modelCfg.modelFileGroup) {
  //       if (!groupMap[entry.modelCfg.modelFileGroup]) {
  //         groupMap[entry.modelCfg.modelFileGroup] = [];
  //       }
  //       groupMap[entry.modelCfg.modelFileGroup].push(entry);
  //     } else {
  //       singleModels.push(entry);
  //     }
  //   });
  //
  //   return { groups: groupMap, singleModels: singleModels };
  // }
}
