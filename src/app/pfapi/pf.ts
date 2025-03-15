import {
  PFBaseCfg,
  PFModelBase,
  PFModelCfg,
  PFModelCfgs,
  PFSyncProviderServiceInterface,
} from './pf.model';
import { PFSyncService } from './pf-sync.service';
import { PFDatabase } from './db/pf-database.class';
import { PFIndexedDbAdapter } from './db/pf-indexed-db-adapter.class';
import { PFMetaModelCtrl } from './pf-meta-model-ctrl';
import { PFModelCtrl } from './pf-model-ctrl';
import { PFSyncDataService } from './pf-sync-data.service';
import { MiniObservable } from './util/mini-observable';

type ExtractPFModelCfgType<T extends PFModelCfg<PFModelBase>> =
  T extends PFModelCfg<infer U> ? U : never;

export type PfapiModelCfgToModelCtrl<T extends PFModelCfgs> = {
  [K in keyof T]: PFModelCtrl<ExtractPFModelCfgType<T[K]>>;
};
/* eslint-disable @typescript-eslint/naming-convention*/

type PFEventMap = {
  'sync:start': undefined;
  'sync:complete': { success: boolean; timestamp: number };
  'sync:error': Error;
  'model:changed': { modelId: string; timestamp: number };
};

// export class PF<PCfg extends PFCfg, Ms extends PFModelCfg<any>[]> {
export class PF<const MD extends PFModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _currentSyncProvider$ =
    new MiniObservable<PFSyncProviderServiceInterface | null>(null);
  private readonly _cfg$: MiniObservable<PFBaseCfg>;
  private readonly _db: PFDatabase;
  private readonly _pfSyncService: PFSyncService<MD>;
  private readonly _pfSyncDataService: PFSyncDataService<MD>;
  private readonly _eventHandlers = new Map<
    keyof PFEventMap,
    Record<symbol, (data: unknown) => void>
  >();

  public readonly metaModel: PFMetaModelCtrl;
  public readonly m: PfapiModelCfgToModelCtrl<MD>;

  constructor(modelCfgs: MD, cfg?: PFBaseCfg) {
    if (PF._wasInstanceCreated) {
      throw new Error('PF: This should only ever be instantiated once');
    }
    PF._wasInstanceCreated = true;

    this._cfg$ = new MiniObservable(cfg || null);

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

    this.metaModel = new PFMetaModelCtrl(this._db, this._cfg$);
    this.m = this._createModels(modelCfgs);

    this._pfSyncDataService = new PFSyncDataService<MD>(this.m);
    this._pfSyncService = new PFSyncService<MD>(
      this._cfg$,
      this._currentSyncProvider$,
      this._pfSyncDataService,
    );
  }

  // TODO type
  sync(): Promise<unknown> {
    return this._pfSyncService.sync();
  }

  setActiveProvider(activeProvider: PFSyncProviderServiceInterface): void {
    this._currentSyncProvider$.next(activeProvider);
  }

  public on<K extends keyof PFEventMap>(
    eventName: K,
    callback: (data: PFEventMap[K]) => void,
  ): () => void {
    // Implement event handling
    const eventId = Symbol();
    this._eventHandlers.set(eventName, {
      ...(this._eventHandlers.get(eventName) || {}),
      [eventId]: callback,
    });

    // Return unsubscribe function
    return () => {
      const handlers = this._eventHandlers.get(eventName);
      if (handlers) {
        delete handlers[eventId];
      }
    };
  }

  pause(): void {}

  private _createModels(modelCfgs: MD): PfapiModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, PFModelCtrl<PFModelBase>>;
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

  /**
   * Updates configuration and propagates changes
   * @param cfg Updated configuration
   */
  // TODO think about this
  public updateCfg(cfg: Partial<PFBaseCfg>): void {
    const currentCfg = this._cfg$.value;
    const newCfg = { ...currentCfg, ...cfg };
    this._cfg$.next(newCfg);
  }
}
