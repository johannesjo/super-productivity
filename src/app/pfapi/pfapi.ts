import {
  PFAPIBaseCfg,
  PFAPIModelCfgs,
  PFAPISyncProviderServiceInterface,
} from './pfapi.model';
import { PFAPISyncService } from './pfapi-sync.service';
import { BehaviorSubject } from 'rxjs';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIIndexedDbAdapter } from './db/pfapi-indexed-db-adapter.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';
import { PfapiModelCtrl } from './pfapi-model-ctrl';

// type ArrayToObject<T extends readonly { id: string }[]> = {
//   [K in T[number]['id']]: { modelCfg: Extract<T[number], { id: K }> };
// };

type ArrayToObject<T extends PFAPIModelCfgs> = {
  [K in T[number]['id']]: PfapiModelCtrl<Extract<T[number], { id: K }>>;
};

// export class PFAPI<PCfg extends PFAPICfg, Ms extends PFAPIModelCfg<any>[]> {
export class PFAPI<const MD extends PFAPIModelCfgs> {
  private readonly _currentSyncProvider$ =
    new BehaviorSubject<PFAPISyncProviderServiceInterface | null>(null);
  private readonly _cfg$: BehaviorSubject<PFAPIBaseCfg>;
  private readonly _pfapiSyncService: PFAPISyncService;
  private static _wasInstanceCreated = false;
  private readonly _db: PFAPIDatabase;

  public readonly metaModel: PFAPIMetaModelCtrl;
  public readonly m: ArrayToObject<MD>;

  constructor(modelCfgs: MD, cfg?: PFAPIBaseCfg) {
    if (PFAPI._wasInstanceCreated) {
      throw new Error('PFAPI: This should only ever be instantiated once');
    }
    PFAPI._wasInstanceCreated = true;

    this._cfg$ = new BehaviorSubject(cfg || null);

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
    this.m = this._createModels(modelCfgs);
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

  private _createModels(array: MD): ArrayToObject<MD> {
    // TODO validate model cfgs
    return array.reduce((acc, item) => {
      // acc[item.id] = { modelCfg: item };
      acc[item.id] = new PfapiModelCtrl(item, this._db, this.metaModel);
      return acc;
    }, {} as ArrayToObject<MD>);
  }

  // getAllModelData(): unknown {}

  // TODO think about this
  // updateCfg(cfg: PFAPICfg): void {}
}
