import {
  PFAPIBaseCfg,
  PFAPIModelCfg,
  PFAPIModelCfgs,
  PFAPISyncProviderServiceInterface,
} from './pfapi.model';
import { PFAPISyncService } from './pfapi-sync.service';
import { BehaviorSubject } from 'rxjs';
import { PFAPIDatabase } from './db/pfapi-database.class';
import { PFAPIIndexedDbAdapter } from './db/pfapi-indexed-db-adapter.class';
import { PFAPIMetaModelCtrl } from './pfapi-meta-model-ctrl';
import { PfapiModelCtrl } from './pfapi-model-ctrl';

type ExtractPFAPIModelCfgType<T extends PFAPIModelCfg<unknown>> =
  T extends PFAPIModelCfg<infer U> ? U : never;

type ModelCfgToModelCtrl<T extends PFAPIModelCfgs> = {
  [K in keyof T]: PfapiModelCtrl<ExtractPFAPIModelCfgType<T[K]>>;
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
  public readonly m: ModelCfgToModelCtrl<MD>;

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

  private _createModels(modelCfgs: MD): ModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, PfapiModelCtrl<unknown>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      result[id] = new PfapiModelCtrl<ExtractPFAPIModelCfgType<typeof item>>(
        item,
        this._db,
        this.metaModel,
      );
    }
    return result as ModelCfgToModelCtrl<MD>;
  }

  // getAllModelData(): unknown {}

  // TODO think about this
  // updateCfg(cfg: PFAPICfg): void {}
}
