import { DBNames, SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';
import { PFEventEmitter } from '../util/events';

// type PrivateCfg = Record<string, unknown>;

export class SyncProviderPrivateCfgStore<T> {
  public static readonly DB_KEY_PREFIX = DBNames.PrivateCfgStorePrefix;

  private readonly _providerId: SyncProviderId;
  private readonly _dbKey: string;
  private readonly _db: Database;
  private readonly _ev: PFEventEmitter;

  private _privateCfgInMemory?: T;

  constructor(
    providerId: SyncProviderId,
    private db: Database,
    private ev: PFEventEmitter,
  ) {
    this._db = db;
    this._ev = ev;
    this._providerId = providerId;
    this._dbKey = SyncProviderPrivateCfgStore.DB_KEY_PREFIX + this._providerId;
  }

  async load(): Promise<T | null> {
    pfLog(
      3,
      `${SyncProviderPrivateCfgStore.name}.${this.load.name}`,
      this._privateCfgInMemory,
    );
    return this._privateCfgInMemory || ((await this._db.load(this._dbKey)) as Promise<T>);
  }

  async save(privateCfg: T): Promise<unknown> {
    const key = this._providerId;
    pfLog(2, `${SyncProviderPrivateCfgStore.name}.${this.save.name}()`, key, privateCfg);
    this._privateCfgInMemory = privateCfg;
    // TODO fix typing
    this._ev.emit('providerPrivateCfgChange', {
      providerId: this._providerId,
      privateCfg: privateCfg as any,
    });
    return this._db.save(this._dbKey, privateCfg);
  }
}
