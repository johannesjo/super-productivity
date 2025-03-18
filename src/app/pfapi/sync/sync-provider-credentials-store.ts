import { SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';

type Credentials = Record<string, unknown>;

export class SyncProviderCredentialsStore {
  public static readonly DB_KEY = '__sync_provider_credentials_';

  private _db: Database;
  private _credentialsInMemory: Credentials = {};

  constructor(private readonly db: Database) {
    this._db = db;
  }

  async getCredentials<T>(key: SyncProviderId): Promise<T | null> {
    return (this._credentialsInMemory[key] || (await this.load())[key]) as T;
  }

  async setCredentials<T>(key: SyncProviderId, value: T): Promise<unknown> {
    this._credentialsInMemory = await this.load();
    this._credentialsInMemory[key] = value;
    pfLog('ModelCtrl.setCredentials()', key, value);
    return this.save(this._credentialsInMemory);
  }

  save(data: Credentials): Promise<unknown> {
    this._credentialsInMemory = data;
    pfLog('ModelCtrl.save()', data);
    return this._db.save(SyncProviderCredentialsStore.DB_KEY, data);
  }

  async load(): Promise<Credentials> {
    pfLog('SyncProviderCredentialsStore.load', this._credentialsInMemory);
    return (
      this._credentialsInMemory ||
      ((await this._db.load(SyncProviderCredentialsStore.DB_KEY)) as Promise<Credentials>)
    );
  }
}
