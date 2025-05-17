import { DatabaseAdapter } from './database-adapter.model';
import { pfLog } from '../util/log';

export class Database {
  private static readonly L = 'Database';

  private _lastParams?: { a: string; key?: string; data?: unknown };
  private _isLocked: boolean = false;
  private readonly _adapter: DatabaseAdapter;
  private readonly _onError: (e: Error) => void;

  constructor(_cfg: { onError: (e: Error) => void; adapter: DatabaseAdapter }) {
    this._adapter = _cfg.adapter;
    this._onError = _cfg.onError;
    this._init().catch((e) => this._onError(e));
  }

  lock(): void {
    pfLog(2, `${Database.L}.${this.lock.name}()`);
    this._isLocked = true;
  }

  unlock(): void {
    pfLog(2, `${Database.L}.${this.unlock.name}()`);
    this._isLocked = false;
  }

  async load<T = unknown>(key: string): Promise<T | void> {
    this._lastParams = { a: 'load', key };
    try {
      return await this._adapter.load<T>(key);
    } catch (e) {
      pfLog(0, 'DB Load Error', { lastParams: this._lastParams, error: e });
      return this._errorHandler(e as Error, this.load, [key]);
    }
  }

  async loadAll<T extends Record<string, unknown>>(): Promise<T | void> {
    this._lastParams = { a: 'loadAll' };
    try {
      return await this._adapter.loadAll<T>();
    } catch (e) {
      pfLog(0, 'DB LoadAll Error', { lastParams: this._lastParams, error: e });
      return this._errorHandler(e as Error, this.loadAll, []);
    }
  }

  async save<T>(key: string, data: T, isIgnoreDBLock = false): Promise<void> {
    this._lastParams = { a: 'save', key, data };
    if (this._isLocked && !isIgnoreDBLock) {
      pfLog(2, 'Blocking write during lock');
      return;
    }
    try {
      return await this._adapter.save(key, data);
    } catch (e) {
      pfLog(0, 'DB Save Error', { lastParams: this._lastParams, error: e });
      return this._errorHandler(e as Error, this.save, [key, data]);
    }
  }

  async remove(key: string, isIgnoreDBLock = false): Promise<unknown> {
    this._lastParams = { a: 'remove', key };
    if (this._isLocked && !isIgnoreDBLock) {
      console.warn('Blocking write during lock');
      return;
    }
    try {
      return await this._adapter.remove(key);
    } catch (e) {
      console.warn('DB Remove Error: Last Params,', this._lastParams);
      return this._errorHandler(e as Error, this.remove, [key]);
    }
  }

  async clearDatabase(isIgnoreDBLock = false): Promise<unknown> {
    if (this._isLocked && !isIgnoreDBLock) {
      console.warn('Blocking write during lock');
      return;
    }
    this._lastParams = { a: 'clearDatabase' };
    try {
      return await this._adapter.clearDatabase();
    } catch (e) {
      console.warn('DB Clear Error: Last Params,', this._lastParams);
      return this._errorHandler(e as Error, this.clearDatabase, []);
    }
  }

  private async _init(): Promise<void> {
    try {
      await this._adapter.init();
    } catch (e) {
      console.error(e);
      pfLog(0, 'Database initialization failed', {
        lastParams: this._lastParams,
        error: e,
      });
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  private async _errorHandler(
    e: Error,
    fn: (...args: any[]) => Promise<any>,
    args: any[],
  ): Promise<void> {
    pfLog(0, `${Database.L}.${this._errorHandler.name}()`, e, fn.name, args);
    this._onError(e);
    throw e; // Rethrow to allow caller to handle
  }
}
