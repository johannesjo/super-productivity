import { Injectable, inject } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { devError } from '../../util/dev-error';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import { IndexedDBAdapterService } from './indexed-db-adapter.service';
import { DBAdapter } from './db-adapter.model';
import { AndroidDbAdapterService } from './android-db-adapter.service';
import { Log } from '../log';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private _translateService = inject(TranslateService);
  private _indexedDbAdapterService = inject(IndexedDBAdapterService);
  private _androidDbAdapterService = inject(AndroidDbAdapterService);

  private _lastParams?: { a: string; key?: string; data?: unknown };
  // private _adapter: DBAdapter =
  //   IS_ANDROID_WEB_VIEW && androidInterface.saveToDb && androidInterface.loadFromDb
  //     ? this._androidDbAdapterService
  //     : this._indexedDbAdapterService;
  private _adapter: DBAdapter = this._indexedDbAdapterService;

  constructor() {
    this._adapter = this._indexedDbAdapterService;
    this._init().then();
  }

  async load(key: string): Promise<unknown> {
    this._lastParams = { a: 'load', key };
    try {
      return await this._adapter.load(key);
    } catch (e) {
      Log.err('DB Load Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.load, [key]);
    }
  }

  async save(key: string, data: unknown): Promise<unknown> {
    this._lastParams = { a: 'save', key, data };
    // disable saving during testing
    // return Promise.resolve();
    try {
      return await this._adapter.save(key, data);
    } catch (e) {
      Log.err('DB Save Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.save, [key, data]);
    }
  }

  async remove(key: string): Promise<unknown> {
    this._lastParams = { a: 'remove', key };
    try {
      return await this._adapter.remove(key);
    } catch (e) {
      Log.err('DB Remove Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.remove, [key]);
    }
  }

  async clearDatabase(): Promise<unknown> {
    this._lastParams = { a: 'clearDatabase' };
    try {
      return await this._adapter.clearDatabase();
    } catch (e) {
      Log.err('DB Clear Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.clearDatabase, []);
    }
  }

  private async _init(): Promise<void> {
    try {
      await this._adapter.init();
    } catch (e) {
      Log.err('Database initialization failed');
      Log.err('_lastParams', this._lastParams);
      Log.err(e);
      alert('DB INIT Error');
      throw new Error(e as any);
    }
  }

  private async _errorHandler(
    e: Error | unknown,
    // eslint-disable-next-line @typescript-eslint/ban-types
    fn: Function,
    args: unknown[],
  ): Promise<void> {
    devError(e);
    if (confirm(this._translateService.instant(T.CONFIRM.RELOAD_AFTER_IDB_ERROR))) {
      this._restartApp();
    } else {
      await this._adapter.teardown();
      await this._init();
      // retry after init
      return fn(...args);
    }
  }

  private _restartApp(): void {
    if (IS_ELECTRON) {
      window.ea.relaunch();
      window.ea.exit(0);
    } else {
      window.location.reload();
    }
  }
}
