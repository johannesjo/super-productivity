import { PFSyncProviderId } from '../pf.const';
import { PFDatabase } from '../db/pf-database.class';
import { pfLog } from '../util/pf-log';

type PFCredentials = Record<string, unknown>;

export class PFSyncProviderCredentialsStore {
  public static readonly DB_KEY = '_PF_sync_provider_credentials_';

  private _db: PFDatabase;
  private _credentialsInMemory: PFCredentials = {};

  constructor(private readonly db: PFDatabase) {
    this._db = db;
  }

  async getCredentials<T>(key: PFSyncProviderId): Promise<T | null> {
    return (this._credentialsInMemory[key] || (await this.load())[key]) as T;
  }

  async setCredentials<T>(key: PFSyncProviderId, value: T): Promise<unknown> {
    this._credentialsInMemory = await this.load();
    this._credentialsInMemory[key] = value;
    pfLog('PFModelCtrl.setCredentials()', key, value);
    return this.save(this._credentialsInMemory);
  }

  save(data: PFCredentials): Promise<unknown> {
    this._credentialsInMemory = data;
    pfLog('PFModelCtrl.save()', data);
    return this._db.save(PFSyncProviderCredentialsStore.DB_KEY, data);
  }

  async load(): Promise<PFCredentials> {
    pfLog('PFSyncProviderCredentialsStore.load', this._credentialsInMemory);
    return (
      this._credentialsInMemory ||
      ((await this._db.load(
        PFSyncProviderCredentialsStore.DB_KEY,
      )) as Promise<PFCredentials>)
    );
  }
}
