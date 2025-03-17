import { PFCompleteModel, PFModelCfgs, PFModelCfgToModelCtrl } from './pf.model';
import { pfLog } from './util/pf-log';

// interface PFGroupMap {
//   [groupId: string]: PFModelCtrl<PFModelBase>[]; // modelIds
// }

export class PFSyncDataService<const MD extends PFModelCfgs> {
  public readonly m: PFModelCfgToModelCtrl<MD>;

  // private _groupMap: PFGroupMap;
  // private _singleModels: PFModelCtrl<PFModelBase>[];

  constructor(m: PFModelCfgToModelCtrl<MD>) {
    this.m = m;
    // const { groups, singleModels } = this._getModelGroups();
    // this._groupMap = groups;
    // this._singleModels = singleModels;
  }

  async getCompleteSyncData(): Promise<PFCompleteModel<MD>> {
    const modelIds = Object.keys(this.m);
    const promises = modelIds.map((modelId) => {
      const modelCtrl = this.m[modelId];
      return modelCtrl.load();
    });

    const allDataArr = await Promise.all(promises);
    const allData = allDataArr.reduce((acc, cur, idx) => {
      acc[modelIds[idx]] = cur;
      return acc;
    }, {});
    return allData as PFCompleteModel<MD>;
  }

  // TODO type
  async importCompleteSyncData(data: PFCompleteModel<MD>): Promise<unknown> {
    pfLog('PFSyncDataService.importCompleteSyncData()', data);
    const modelIds = Object.keys(data);
    const promises = modelIds.map((modelId) => {
      const modelData = data[modelId];
      const modelCtrl = this.m[modelId];
      return modelCtrl.save(modelData);
    });
    return Promise.all(promises);
  }

  // TODO type
  async importPartialSyncData(partialData: Partial<PFCompleteModel<MD>>): Promise<any> {}

  // TODO type
  // TODO migrations

  // private _getAllModelIds(): string[] {
  //
  // }

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
