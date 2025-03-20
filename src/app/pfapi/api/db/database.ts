import { DatabaseAdapter } from './database-adapter.model';
import { pfLog } from '../util/log';

export class Database {
  private _lastParams?: { a: string; key?: string; data?: unknown };
  private _adapter: DatabaseAdapter;
  private _onError: (e: Error) => void;

  constructor(cfg: { onError: (e: Error) => void; adapter: DatabaseAdapter }) {
    this._adapter = cfg.adapter;
    this._onError = cfg.onError;
    this._init().then();
  }

  async load(key: string): Promise<unknown> {
    this._lastParams = { a: 'load', key };
    try {
      return await this._adapter.load(key);
    } catch (e) {
      console.warn('DB Load Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.load, [key]);
    }
  }

  async loadAll(): Promise<unknown> {
    this._lastParams = { a: 'loadAll' };
    try {
      return await this._adapter.loadAll();
    } catch (e) {
      console.warn('DB LoadAll Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.loadAll, []);
    }
  }

  async save(key: string, data: unknown): Promise<unknown> {
    this._lastParams = { a: 'save', key, data };
    // disable saving during testing
    // return Promise.resolve();
    try {
      return await this._adapter.save(key, data);
    } catch (e) {
      console.warn('DB Save Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.save, [key, data]);
    }
  }

  async remove(key: string): Promise<unknown> {
    this._lastParams = { a: 'remove', key };
    try {
      return await this._adapter.remove(key);
    } catch (e) {
      console.warn('DB Remove Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.remove, [key]);
    }
  }

  async clearDatabase(): Promise<unknown> {
    this._lastParams = { a: 'clearDatabase' };
    try {
      return await this._adapter.clearDatabase();
    } catch (e) {
      console.warn('DB Clear Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.clearDatabase, []);
    }
  }

  private async _init(): Promise<void> {
    try {
      await this._adapter.init();
    } catch (e) {
      console.error('Database initialization failed');
      console.error('_lastParams', this._lastParams);
      console.error(e);
      alert('DB INIT Error');
      throw new Error(e as any);
    }
  }

  private async _errorHandler(
    e: Error | unknown,
    // eslint-disable-next-line @typescript-eslint/ban-types
    fn: Function,
    args: any[],
  ): Promise<void> {
    pfLog(1, `${Database.name}.${this._errorHandler.name}()`, e, fn, args);
    this._onError(e as Error);

    // TODO maybe
    // devError(e);
    // if (confirm(this._translateService.instant(T.CONFIRM.RELOAD_AFTER_IDB_ERROR))) {
    //   this._restartApp();
    // } else {
    //   await this._adapter.teardown();
    //   await this._init();
    //   // retry after init
    //   return fn(...args);
    // }
  }
}
