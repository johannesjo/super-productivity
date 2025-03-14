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
import { PFAPIModelCtrl } from './pfapi-model-ctrl';
import { PFAPISyncDataService } from './pfapi-sync-data.service';

type ExtractPFAPIModelCfgType<T extends PFAPIModelCfg<unknown>> =
  T extends PFAPIModelCfg<infer U> ? U : never;

export type PfapiModelCfgToModelCtrl<T extends PFAPIModelCfgs> = {
  [K in keyof T]: PFAPIModelCtrl<ExtractPFAPIModelCfgType<T[K]>>;
};

// export class PFAPI<PCfg extends PFAPICfg, Ms extends PFAPIModelCfg<any>[]> {
export class PFAPI<const MD extends PFAPIModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _currentSyncProvider$ =
    new BehaviorSubject<PFAPISyncProviderServiceInterface | null>(null);
  private readonly _cfg$: BehaviorSubject<PFAPIBaseCfg>;
  private readonly _db: PFAPIDatabase;
  private readonly _pfapiSyncService: PFAPISyncService<MD>;
  private readonly _pfapiSyncDataService: PFAPISyncDataService<MD>;

  public readonly metaModel: PFAPIMetaModelCtrl;
  public readonly m: PfapiModelCfgToModelCtrl<MD>;

  constructor(modelCfgs: MD, cfg?: PFAPIBaseCfg) {
    if (PFAPI._wasInstanceCreated) {
      throw new Error('PFAPI: This should only ever be instantiated once');
    }
    PFAPI._wasInstanceCreated = true;

    this._cfg$ = new BehaviorSubject(cfg || null);

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

    this._pfapiSyncDataService = new PFAPISyncDataService<MD>(this.m);
    this._pfapiSyncService = new PFAPISyncService<MD>(
      this._cfg$,
      this._currentSyncProvider$,
      this._pfapiSyncDataService,
    );
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

  private _createModels(modelCfgs: MD): PfapiModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, PFAPIModelCtrl<unknown>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      result[id] = new PFAPIModelCtrl<ExtractPFAPIModelCfgType<typeof item>>(
        id,
        item,
        this._db,
        this.metaModel,
      );
    }
    return result as PfapiModelCfgToModelCtrl<MD>;
  }

  // getAllModelData(): unknown {}

  // TODO think about this
  // updateCfg(cfg: PFAPICfg): void {}
}
