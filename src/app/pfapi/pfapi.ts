import {
  BaseCfg,
  CompleteModel,
  ExtractModelCfgType,
  ModelBase,
  ModelCfgs,
  ModelCfgToModelCtrl,
} from './pfapi.model';
import { SyncService } from './sync/sync.service';
import { Database } from './db/database';
import { IndexedDbAdapter } from './db/indexed-db-adapter';
import { MetaModelCtrl } from './model-ctrl/meta-model-ctrl';
import { ModelCtrl } from './model-ctrl/model-ctrl';
import { SyncDataService } from './sync/sync-data.service';
import { MiniObservable } from './util/mini-observable';
import { SyncProviderServiceInterface } from './sync/sync-provider.interface';
import { pfLog } from './util/log';
import { SyncProviderId, SyncStatus } from './pfapi.const';
import { EncryptAndCompressHandlerService } from './sync/encrypt-and-compress-handler.service';
import { SyncProviderCredentialsStore } from './sync/sync-provider-credentials-store';
import { NoSyncProviderSet } from './errors/errors';

// type EventMap = {
// 'sync:start': undefined;
// 'sync:complete': { success: boolean; timestamp: number };
// 'sync:error': Error;
// 'model:changed': { modelId: string; timestamp: number };
// 'credentials:update': { credentials: unknown };
// };

// export class <PCfg extends Cfg, Ms extends ModelCfg<any>[]> {
export class Pfapi<const MD extends ModelCfgs> {
  private static _wasInstanceCreated = false;

  private readonly _syncProvider$: MiniObservable<SyncProviderServiceInterface<unknown> | null> =
    new MiniObservable<SyncProviderServiceInterface<unknown> | null>(null);

  private readonly _db: Database;
  private readonly _syncService: SyncService<MD>;
  private readonly _syncDataService: SyncDataService<MD>;

  // private readonly _eventHandlers = new Map<
  //   keyof EventMap,
  //   Record<symbol, (data: unknown) => void>
  // >();

  public readonly metaModel: MetaModelCtrl;
  public readonly m: ModelCfgToModelCtrl<MD>;
  public readonly syncProviders: SyncProviderServiceInterface<unknown>[];

  constructor(
    modelCfgs: MD,
    syncProviders: SyncProviderServiceInterface<unknown>[],
    cfg?: BaseCfg,
  ) {
    if (Pfapi._wasInstanceCreated) {
      throw new Error(': This should only ever be instantiated once');
    }
    Pfapi._wasInstanceCreated = true;

    this._db = new Database({
      onError: cfg?.onDbError || (() => undefined),
      adapter:
        cfg?.dbAdapter ||
        new IndexedDbAdapter({
          // TODO to variable
          dbName: 'pf',
          dbMainName: 'main',
          version: 1,
        }),
    });

    this.metaModel = new MetaModelCtrl(this._db);
    this.m = this._createModels(modelCfgs);
    pfLog(2, `m`, this.m);

    this.syncProviders = syncProviders;
    this.syncProviders.forEach((sp) => {
      sp.credentialsStore = new SyncProviderCredentialsStore<unknown>(this._db, sp.id);
    });

    this._syncDataService = new SyncDataService<MD>(this.m);
    this._syncService = new SyncService<MD>(
      this._syncProvider$,
      this._syncDataService,
      this.metaModel,
      new EncryptAndCompressHandlerService(),
    );
  }

  private _unsubscribeCredentials: () => void = () => {};

  // TODO type
  async sync(): Promise<SyncStatus | any> {
    // pfLog(3, `${this.sync.name}()`);
    const result = await this._syncService.sync();
    pfLog(2, `${this.sync.name}() result:`, result);
    return result;
  }

  setActiveProvider(activeProviderId: SyncProviderId): void {
    // this._unsubscribeCredentials();
    // this._unsubscribeCredentials = activeProvider.credentials$.subscribe((v) => {
    //   pfLog('credentials update', v);
    //   if (v) {
    //     this._syncProviderCredentialsStore.setCredentials(activeProvider.id, v);
    //   }
    // });
    const provider = this.syncProviders.find((sp) => sp.id === activeProviderId);
    pfLog(2, `${this.setActiveProvider.name}()`, activeProviderId, provider);
    this._syncProvider$.next(provider || null);
  }

  // TODO typing
  setCredentialsForActiveProvider(credentials: unknown): Promise<void> {
    pfLog(
      2,
      `${this.setCredentialsForActiveProvider.name}()`,
      credentials,
      this._syncProvider$.value,
    );
    if (!this._syncProvider$.value) {
      throw new NoSyncProviderSet();
    }
    return this._syncProvider$.value.setCredentials(credentials);
  }

  importCompleteData(data: CompleteModel<MD>): Promise<unknown> {
    pfLog(2, `${this.importCompleteData.name}()`, data);
    return this._syncDataService.importCompleteSyncData(data);
  }

  // public on<K extends keyof EventMap>(
  //   eventName: K,
  //   callback: (data: EventMap[K]) => void,
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

  private _createModels(modelCfgs: MD): ModelCfgToModelCtrl<MD> {
    const result = {} as Record<string, ModelCtrl<ModelBase>>;
    // TODO validate modelCfgs
    for (const [id, item] of Object.entries(modelCfgs)) {
      result[id] = new ModelCtrl<ExtractModelCfgType<typeof item>>(
        id,
        item,
        this._db,
        this.metaModel,
      );
    }
    // TODO fix type :(
    console.log('CHECK if expected', result);

    return result as unknown as ModelCfgToModelCtrl<MD>;
  }

  // getAllModelData(): unknown {}

  // /**
  //  * Updates configuration and propagates changes
  //  * @param cfg Updated configuration
  //  */
  // // TODO think about this
  // public updateCfg(cfg: Partial<BaseCfg>): void {
  //   const currentCfg = this._cfg$.value;
  //   const newCfg = { ...currentCfg, ...cfg };
  //   this._cfg$.next(newCfg);
  // }
}
