import { DBNames, SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';
import { PFEventEmitter } from '../util/events';

/**
 * Event payload for configuration changes
 */
export interface ProviderConfigChangeEvent<T> {
  providerId: SyncProviderId;
  privateCfg: T;
}

/**
 * Store for managing sync provider private configuration
 * Handles persistence and change notifications
 */
export class SyncProviderPrivateCfgStore<T> {
  public static readonly DB_KEY_PREFIX = DBNames.PrivateCfgStorePrefix;

  private readonly _dbKey: string;

  private _privateCfgInMemory?: T;

  constructor(
    private readonly _providerId: SyncProviderId,
    private readonly _db: Database,
    private readonly _ev: PFEventEmitter,
  ) {
    this._dbKey = SyncProviderPrivateCfgStore.DB_KEY_PREFIX + _providerId;
  }

  /**
   * Loads the provider's private configuration
   * @returns The private configuration or null if not found
   * @throws Error if database load operation fails
   */
  async load(): Promise<T | null> {
    pfLog(
      3,
      `${SyncProviderPrivateCfgStore.name}.${this.load.name}`,
      this._privateCfgInMemory,
    );

    // Return cached config if available
    if (this._privateCfgInMemory) {
      return this._privateCfgInMemory;
    }

    try {
      const loadedConfig = (await this._db.load(this._dbKey)) as T;
      if (loadedConfig) {
        this._privateCfgInMemory = loadedConfig;
      }
      return loadedConfig;
    } catch (error) {
      pfLog(0, `Failed to load private config: ${error}`);
      throw new Error(`Failed to load private config: ${error}`);
    }
  }

  /**
   * Saves the provider's private configuration
   * @param privateCfg Configuration to save
   * @returns Promise resolving after save completes
   * @throws Error if database save operation fails
   */
  async save(privateCfg: T): Promise<unknown> {
    const key = this._providerId;
    pfLog(2, `${SyncProviderPrivateCfgStore.name}.${this.save.name}()`, key, privateCfg);

    this._privateCfgInMemory = privateCfg;

    // Emit configuration change event
    this._ev.emit('providerPrivateCfgChange', {
      providerId: this._providerId,
      privateCfg: privateCfg as any,
    });

    try {
      return await this._db.save(this._dbKey, privateCfg);
    } catch (error) {
      pfLog(0, `Failed to save private config: ${error}`);
      throw new Error(`Failed to save private config: ${error}`);
    }
  }
}
