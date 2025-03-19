import { DBNames, SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';

// type Credentials = Record<string, unknown>;

export class SyncProviderCredentialsStore<T> {
  public static readonly DB_KEY_PREFIX = DBNames.CredentialsStorePrefix;

  private readonly _providerId: SyncProviderId;
  private readonly _dbKey: string;
  private readonly _db: Database;

  private _credentialsInMemory?: T;

  constructor(
    private db: Database,
    providerId: SyncProviderId,
  ) {
    this._db = db;
    this._providerId = providerId;
    this._dbKey = SyncProviderCredentialsStore.DB_KEY_PREFIX + this._providerId;
  }

  async load(): Promise<T | null> {
    pfLog(
      3,
      `${SyncProviderCredentialsStore.name}.${this.load.name}`,
      this._credentialsInMemory,
    );
    return (
      this._credentialsInMemory || ((await this._db.load(this._dbKey)) as Promise<T>)
    );
  }

  async save(credentials: T): Promise<unknown> {
    const key = this._providerId;
    pfLog(
      2,
      `${SyncProviderCredentialsStore.name}.${this.save.name}()`,
      key,
      credentials,
    );
    this._credentialsInMemory = credentials;
    return this._db.save(this._dbKey, credentials);
  }
}
