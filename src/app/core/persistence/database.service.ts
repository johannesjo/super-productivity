import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { devError } from '../../util/dev-error';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';
import { IndexedDBAdapterService } from './indexed-db-adapter.service';
import { DBAdapter } from './db-adapter.model';
import { AndroidDbAdapterService } from './android-db-adapter.service';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private _lastParams?: { a: string; key?: string; data?: unknown };
  // private _adapter: DBAdapter =
  //   IS_ANDROID_WEB_VIEW && androidInterface.saveToDbNew && androidInterface.loadFromDb
  //     ? this._androidDbAdapterService
  //     : this._indexedDbAdapterService;
  private _adapter: DBAdapter = this._indexedDbAdapterService;

  constructor(
    private _translateService: TranslateService,
    private _indexedDbAdapterService: IndexedDBAdapterService,
    private _androidDbAdapterService: AndroidDbAdapterService,
  ) {
    this._adapter = this._indexedDbAdapterService;
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
