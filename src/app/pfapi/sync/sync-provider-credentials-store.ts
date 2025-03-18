import { DBNames, SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';

type Credentials = Record<string, unknown>;

export class SyncProviderCredentialsStore<T> {
  public static readonly DB_KEY_PREFIX = DBNames.CredentialsStorePrefix;

  private readonly _providerId: SyncProviderId;
  private readonly _dbKey: string;
  private readonly _db: Database;

  private _credentialsInMemory: Credentials = {};

  constructor(
    private db: Database,
    providerId: SyncProviderId,
  ) {
    this._db = db;
    this._providerId = providerId;
    this._dbKey = SyncProviderCredentialsStore.DB_KEY_PREFIX + this._providerId;
  }

  async getCredentials(): Promise<T | null> {
    const key = this._providerId;
    return (this._credentialsInMemory[key] || (await this.load())[key]) as T;
  }

  // TODO check why to functions and maybe adjust
  async setCredentials(value: T): Promise<unknown> {
    const key = this._providerId;
    this._credentialsInMemory = await this.load();
    this._credentialsInMemory[key] = value;
    pfLog(
      2,
      `${SyncProviderCredentialsStore.name}.${this.setCredentials.name}()`,
      key,
      value,
    );
    return this.save(this._credentialsInMemory);
  }

  save(data: Credentials): Promise<unknown> {
    this._credentialsInMemory = data;
    pfLog(2, `${SyncProviderCredentialsStore.name}.${this.save.name}()`, data);
    return this._db.save(this._dbKey, data);
  }

  async load(): Promise<Credentials> {
    // pfLog(
    //   3,
    //   `${SyncProviderCredentialsStore.name}.${this.load.name}`,
    //   this._credentialsInMemory,
    // );
    return (
      this._credentialsInMemory ||
      ((await this._db.load(this._dbKey)) as Promise<Credentials>)
    );
  }
}
