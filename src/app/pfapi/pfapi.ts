import {
  PFAPICfg,
  PFAPIModelCfg,
  PFAPISyncProviderServiceInterface,
} from './pfapi.model';
import { PFAPISyncService } from './pfapi-sync.service';
import { BehaviorSubject } from 'rxjs';
import { PfapiModelCtrl } from './pfapi-model-ctrl';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIIndexedDbAdapter } from './db/pfapi-indexed-db-adapter.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';

// export class PFAPI<PCfg extends PFAPICfg, Ms extends PFAPIModelCfg<any>[]> {
export class PFAPI<Ms extends PFAPIModelCfg<unknown>[]> {
  private readonly _currentSyncProvider$ =
    new BehaviorSubject<PFAPISyncProviderServiceInterface | null>(null);
  private readonly _cfg$: BehaviorSubject<PFAPICfg>;
  private readonly _pfapiSyncService: PFAPISyncService<Ms>;
  private static _wasInstanceCreated = false;
  private readonly _db: PFAPIDatabase;

  public readonly metaModel: PFAPIMetaModelCtrl;
  public readonly m: { [modelId: string]: PfapiModelCtrl<unknown> } = {};
  // private _modelGroups: { [groupId: string]: PfapiModelGroupCtrl<unknown> } = {};

  constructor(cfg: PFAPICfg) {
    if (PFAPI._wasInstanceCreated) {
      throw new Error('PFAPI: This should only ever be instantiated once');
    }
    PFAPI._wasInstanceCreated = true;

    this._cfg$ = new BehaviorSubject(cfg);

    this._pfapiSyncService = new PFAPISyncService(this._cfg$, this._currentSyncProvider$);
    this._db = new PFAPIDatabase({
      onError: cfg.onDbError,
      adapter:
        cfg.dbAdapter ||
        new PFAPIIndexedDbAdapter({
          dbName: 'pfapi',
          dbMainName: 'main',
          version: 1,
        }),
    });

    this.metaModel = new PFAPIMetaModelCtrl(this._db);
    cfg.modelCfgs.forEach((modelCfg) => {
      // TODO validate model
      this.m[modelCfg.id] = new PfapiModelCtrl(modelCfg, this._db, this.metaModel);
    });
  }

  // init(): void {}

  setActiveProvider(activeProvider: PFAPISyncProviderServiceInterface): void {
    this._currentSyncProvider$.next(activeProvider);
  }

  on(evName: string, cb: (ev: any) => void): any {}

  // TODO type
  sync(): Promise<unknown> {
    return this._pfapiSyncService.sync();
  }

  pause(): void {}

  // getAllModelData(): unknown {}

  // TODO think about this
  // updateCfg(cfg: PFAPICfg): void {}
}

// interface MyModel {
//   id: string;
//   name: string;
//   age: number;
// }
//
// type ModelCfgs = [PFAPIModelCfg<MyModel>];
// const modelCfgs: ModelCfgs = [
//   {
//     id: 'myModelId',
//     // ...
//   },
// ];
// const pfapi = new PFAPI<ModelCfgs>({ modelCfgs });
// // this should work
// pfapi.m.myModelId.save({ id: '1', name: 'test', age: 10 });
//
// // this should throw a typing error
// pfapi.m.otherd.save({ id: '1', name: 'test', age: 10 });
