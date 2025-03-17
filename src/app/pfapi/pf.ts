import {
  PFExtractModelCfgType,
  PFBaseCfg,
  PFModelBase,
  PFModelCfgs,
  PFModelCfgToModelCtrl,
  PFCompleteModel,
} from './pf.model';
import { PFSyncService } from './pf-sync.service';
import { PFDatabase } from './db/pf-database.class';
import { PFIndexedDbAdapter } from './db/pf-indexed-db-adapter.class';
import { PFMetaModelCtrl } from './pf-meta-model-ctrl';
import { PFModelCtrl } from './pf-model-ctrl';
import { PFSyncDataService } from './pf-sync-data.service';
import { MiniObservable } from './util/mini-observable';
import { PFSyncProviderServiceInterface } from './sync-provider-services/pf-sync-provider.interface';
import { pfLog } from './util/pf-log';
import { PFSyncStatus } from './pf.const';

// type PFEventMap = {
//   'sync:start': undefined;
//   'sync:complete': { success: boolean; timestamp: number };
//   'sync:error': Error;
//   'model:changed': { modelId: string; timestamp: number };
// };

// export class PF<PCfg extends PFCfg, Ms extends PFModelCfg<any>[]> {
export class PF<const MD extends PFModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _syncProvider$: MiniObservable<PFSyncProviderServiceInterface<unknown> | null> =
    new MiniObservable<PFSyncProviderServiceInterface<unknown> | null>(null);
  private readonly _cfg$: MiniObservable<PFBaseCfg>;

  private readonly _db: PFDatabase;
  private readonly _pfSyncService: PFSyncService<MD>;
  private readonly _pfSyncDataService: PFSyncDataService<MD>;

  // private readonly _eventHandlers = new Map<
  //   keyof PFEventMap,
  //   Record<symbol, (data: unknown) => void>
  // >();

  public readonly metaModel: PFMetaModelCtrl;
  public readonly m: PFModelCfgToModelCtrl<MD>;

  constructor(modelCfgs: MD, cfg?: PFBaseCfg) {
    if (PF._wasInstanceCreated) {
      throw new Error('PF: This should only ever be instantiated once');
    }
    PF._wasInstanceCreated = true;

    this._cfg$ = new MiniObservable(cfg || {});

    this._db = new PFDatabase({
      onError: cfg?.onDbError || (() => undefined),
      adapter:
        cfg?.dbAdapter ||
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
      this._syncProvider$,
      this._pfSyncDataService,
      this.metaModel,
    );
  }

  // TODO type
  async sync(): Promise<PFSyncStatus | any> {
    pfLog('sync()');
    const result = await this._pfSyncService.sync();
    pfLog('sync(): result:', result);
    return result;
  }

  setActiveProvider(activeProvider: PFSyncProviderServiceInterface<unknown>): void {
    pfLog('setActiveProvider()', activeProvider);
    this._syncProvider$.next(activeProvider);
  }

  // TODO typing
  setCredentialsForActiveProvider(credentials: unknown): void {
    pfLog('setCredentialsForActiveProvider()', credentials);
    this._syncProvider$.value?.setCredentials(credentials);
  }

  importCompleteData(data: PFCompleteModel<MD>): Promise<unknown> {
    pfLog('importCompleteData()', data);
    return this._pfSyncDataService.importCompleteSyncData(data);
  }

  // public on<K extends keyof PFEventMap>(
  //   eventName: K,
  //   callback: (data: PFEventMap[K]) => void,
  // ): () => void {
  //   // Implement event handling
  //   const eventId = Symbol();
  //   this._eventHandlers.set(eventName, {
  //     ...(this._eventHandlers.get(eventName) || {}),
  //     [eventId]: callback,
  //   });
  //
  //   // Return unsubscribe function
  //   return () => {
  //     const handlers = this._eventHandlers.get(eventName);
  //     if (handlers) {
  //       delete handlers[eventId];
  //     }
  //   };
  // }

  pause(): void {}

  private _createModels(modelCfgs: MD): PFModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, PFModelCtrl<PFModelBase>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      result[id] = new PFModelCtrl<PFExtractModelCfgType<typeof item>>(
        id,
        item,
        this._db,
        this.metaModel,
      );
    }
    // TODO fix type :(
    console.log('CHECK if expected', result);

    return result as unknown as PFModelCfgToModelCtrl<MD>;
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
