import { DBNames, SyncProviderId } from '../pfapi.const';
import { Database } from '../db/database';
import { PFLog } from '../../../core/log';
import { PFEventEmitter } from '../util/events';
import { PrivateCfgByProviderId } from '../pfapi.model';

/**
 * Store for managing sync provider private configuration
 * Handles persistence and change notifications
 */
export class SyncProviderPrivateCfgStore<PID extends SyncProviderId> {
  private static readonly L = 'SyncProviderPrivateCfgStore';
  public static readonly DB_KEY_PREFIX = DBNames.PrivateCfgStorePrefix;

  private readonly _dbKey: string;
  private _privateCfgInMemory?: PrivateCfgByProviderId<PID>;

  constructor(
    private readonly _providerId: PID,
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
  async load(): Promise<PrivateCfgByProviderId<PID> | null> {
    PFLog.verbose(
      `${SyncProviderPrivateCfgStore.L}.${this.load.name}`,
      // NEVER EVER LOG THIS FOR PRODUCTION!!!!!
      typeof this._privateCfgInMemory,
    );

    // Return cached config if available
    if (this._privateCfgInMemory) {
      return this._privateCfgInMemory;
    }

    try {
      const loadedConfig = (await this._db.load(
        this._dbKey,
      )) as PrivateCfgByProviderId<PID>;
      if (loadedConfig) {
        this._privateCfgInMemory = loadedConfig;
      }
      return loadedConfig;
    } catch (error) {
      PFLog.critical(`Failed to load private config: ${error}`);
      throw new Error(`Failed to load private config: ${error}`);
    }
  }

  /**
   * Sets the complete provider's private configuration
   * Use this only for initial setup or complete replacement
   * For updates, use updatePartial() instead
   * @param privateCfg Complete configuration to set
   * @returns Promise resolving after save completes
   * @throws Error if database save operation fails
   */
  async setComplete(privateCfg: PrivateCfgByProviderId<PID>): Promise<unknown> {
    return this._save(privateCfg);
  }

  /**
   * Updates the provider's private configuration with partial data
   * Safely merges updates with existing configuration to prevent data loss
   * @param updates Partial configuration updates to apply
   * @returns Promise resolving after save completes
   * @throws Error if no existing configuration found or save fails
   */
  async updatePartial(updates: Partial<PrivateCfgByProviderId<PID>>): Promise<unknown> {
    const existing = await this.load();
    if (!existing) {
      throw new Error(
        `Cannot update private config for ${this._providerId}: no existing config found`,
      );
    }
    return this._save({ ...existing, ...updates });
  }

  /**
   * Upserts the provider's private configuration with partial data
   * If no existing configuration exists, creates a new one with the provided updates
   * @param updates Partial configuration updates to apply
   * @returns Promise resolving after save completes
   * @throws Error if save fails
   */
  async upsertPartial(updates: Partial<PrivateCfgByProviderId<PID>>): Promise<unknown> {
    const existing = await this.load();
    const privateCfg = existing
      ? { ...existing, ...updates }
      : (updates as PrivateCfgByProviderId<PID>);
    return this._save(privateCfg);
  }

  /**
   * Internal method to save configuration
   * @private
   */
  private async _save(privateCfg: PrivateCfgByProviderId<PID>): Promise<unknown> {
    const key = this._providerId;
    PFLog.normal(
      `${SyncProviderPrivateCfgStore.L}._save()`,
      key,
      typeof this._privateCfgInMemory,
    );

    this._privateCfgInMemory = privateCfg;

    // Emit configuration change event
    this._ev.emit('providerPrivateCfgChange', {
      providerId: this._providerId,
      privateCfg,
    });

    try {
      // NOTE we always want to ignore DB lock during sync as it is unrelated to sync data in every single case
      return await this._db.save(this._dbKey, privateCfg, true);
    } catch (error) {
      PFLog.critical(`Failed to save private config: ${error}`);
      throw new Error(`Failed to save private config: ${error}`);
    }
  }
}
