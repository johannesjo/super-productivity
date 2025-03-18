import { CompleteModel, ModelCfgs, ModelCfgToModelCtrl } from '../pfapi.model';
import { pfLog } from '../util/log';

// interface GroupMap {
//   [groupId: string]: ModelCtrl<ModelBase>[]; // modelIds
// }

export class SyncDataService<const MD extends ModelCfgs> {
  public readonly m: ModelCfgToModelCtrl<MD>;

  // private _groupMap: GroupMap;
  // private _singleModels: ModelCtrl<ModelBase>[];

  constructor(m: ModelCfgToModelCtrl<MD>) {
    this.m = m;
    // const { groups, singleModels } = this._getModelGroups();
    // this._groupMap = groups;
    // this._singleModels = singleModels;
  }

  async getCompleteSyncData(): Promise<CompleteModel<MD>> {
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
    return allData as CompleteModel<MD>;
  }

  // TODO type
  async importCompleteSyncData(data: CompleteModel<MD>): Promise<unknown> {
    pfLog(2, `${SyncDataService.name}.${this.importCompleteSyncData.name}`, data);
    const modelIds = Object.keys(data);
    const promises = modelIds.map((modelId) => {
      const modelData = data[modelId];
      const modelCtrl = this.m[modelId];
      return modelCtrl.save(modelData);
    });
    return Promise.all(promises);
  }

  // TODO type
  async importPartialSyncData(partialData: Partial<CompleteModel<MD>>): Promise<any> {}

  // TODO type
  // TODO migrations

  // private _getAllModelIds(): string[] {
  //
  // }

  // private _getModelGroups(): {
  //   groups: GroupMap;
  //   singleModels: ModelCtrl<ModelBase>[];
  // } {
  //   const groupMap: GroupMap = {};
  //   const singleModels: ModelCtrl<ModelBase>[] = [];
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
