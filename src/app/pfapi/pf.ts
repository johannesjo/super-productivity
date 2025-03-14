import {
  PFBaseCfg,
  PFModelCfg,
  PFModelCfgs,
  PFSyncProviderServiceInterface,
} from './pf.model';
import { PFSyncService } from './pf-sync.service';
import { BehaviorSubject } from 'rxjs';
import { PFDatabase } from './db/pf-database.class';
import { PFIndexedDbAdapter } from './db/pf-indexed-db-adapter.class';
import { PFMetaModelCtrl } from './pf-meta-model-ctrl';
import { PFModelCtrl } from './pf-model-ctrl';
import { PFSyncDataService } from './pf-sync-data.service';

type ExtractPFModelCfgType<T extends PFModelCfg<unknown>> =
  T extends PFModelCfg<infer U> ? U : never;

export type PfapiModelCfgToModelCtrl<T extends PFModelCfgs> = {
  [K in keyof T]: PFModelCtrl<ExtractPFModelCfgType<T[K]>>;
};

// export class PF<PCfg extends PFCfg, Ms extends PFModelCfg<any>[]> {
export class PF<const MD extends PFModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _currentSyncProvider$ =
    new BehaviorSubject<PFSyncProviderServiceInterface | null>(null);
  private readonly _cfg$: BehaviorSubject<PFBaseCfg>;
  private readonly _db: PFDatabase;
  private readonly _pfSyncService: PFSyncService<MD>;
  private readonly _pfSyncDataService: PFSyncDataService<MD>;

  public readonly metaModel: PFMetaModelCtrl;
  public readonly m: PfapiModelCfgToModelCtrl<MD>;

  constructor(modelCfgs: MD, cfg?: PFBaseCfg) {
    if (PF._wasInstanceCreated) {
      throw new Error('PF: This should only ever be instantiated once');
    }
    PF._wasInstanceCreated = true;

    this._cfg$ = new BehaviorSubject(cfg || null);

    this._db = new PFDatabase({
      onError: cfg.onDbError,
      adapter:
        cfg.dbAdapter ||
        new PFIndexedDbAdapter({
          dbName: 'pf',
          dbMainName: 'main',
          version: 1,
        }),
    });

    this.metaModel = new PFMetaModelCtrl(this._db);
    this.m = this._createModels(modelCfgs);

    this._pfSyncDataService = new PFSyncDataService<MD>(this.m);
    this._pfSyncService = new PFSyncService<MD>(
      this._cfg$,
      this._currentSyncProvider$,
      this._pfSyncDataService,
    );
  }

  // init(): void {}

  setActiveProvider(activeProvider: PFSyncProviderServiceInterface): void {
    this._currentSyncProvider$.next(activeProvider);
  }

  on(evName: string, cb: (ev: any) => void): any {}

  // TODO type
  sync(): Promise<unknown> {
    return this._pfSyncService.sync();
  }

  pause(): void {}

  private _createModels(modelCfgs: MD): PfapiModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, PFModelCtrl<unknown>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      result[id] = new PFModelCtrl<ExtractPFModelCfgType<typeof item>>(
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
  // updateCfg(cfg: PFCfg): void {}
}
