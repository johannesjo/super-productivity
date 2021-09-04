import { Injectable } from '@angular/core';
import { DBSchema, openDB } from 'idb';
import { IDBPDatabase } from 'idb/build/esm/entry';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, shareReplay, take } from 'rxjs/operators';
import { ElectronService } from '../electron/electron.service';
import { IS_ELECTRON } from '../../app.constants';
import { devError } from '../../util/dev-error';
import { TranslateService } from '@ngx-translate/core';
import { T } from '../../t.const';

const DB_NAME = 'SUP';
const DB_MAIN_NAME = 'SUP_STORE';
const VERSION = 2;

interface MyDb extends DBSchema {
  [DB_MAIN_NAME]: any;

  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  db?: IDBPDatabase<MyDb>;
  isReady$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private _afterReady$: Observable<boolean> = this.isReady$.pipe(
    filter((isReady) => isReady),
    shareReplay(1),
  );

  private _lastParams?: { a: string; key?: string; data?: unknown };

  constructor(
    private _electronService: ElectronService,
    private _translateService: TranslateService,
  ) {
    this._init().then();
  }

  async load(key: string): Promise<unknown> {
    this._lastParams = { a: 'load', key };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).get(DB_MAIN_NAME, key);
    } catch (e) {
      console.warn('DB Load Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.load, [key]);
    }
  }

  async save(key: string, data: unknown): Promise<unknown> {
    this._lastParams = { a: 'save', key, data };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).put(DB_MAIN_NAME, data, key);
    } catch (e) {
      console.warn('DB Save Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.save, [key, data]);
    }
  }

  async remove(key: string): Promise<unknown> {
    this._lastParams = { a: 'remove', key };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).delete(DB_MAIN_NAME, key);
    } catch (e) {
      console.warn('DB Remove Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.remove, [key]);
    }
  }

  async clearDatabase(): Promise<unknown> {
    this._lastParams = { a: 'clearDatabase' };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).clear(DB_MAIN_NAME);
    } catch (e) {
      console.warn('DB Clear Error: Last Params,', this._lastParams);
      return this._errorHandler(e, this.clearDatabase, []);
    }
  }

  private async _init(): Promise<IDBPDatabase<MyDb>> {
    try {
      this.db = await openDB<MyDb>(DB_NAME, VERSION, {
        // upgrade(db: IDBPDatabase<MyDb>, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction<MyDb>) {
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        upgrade(db: IDBPDatabase<MyDb>, oldVersion: number, newVersion: number | null) {
          console.log('IDB UPGRADE', oldVersion, newVersion);
          db.createObjectStore(DB_MAIN_NAME);
        },
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        blocked(): void {
          alert('IDB BLOCKED');
        },
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        blocking(): void {
          alert('IDB BLOCKING');
        },
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        terminated(): void {
          alert('IDB TERMINATED');
        },
      });
    } catch (e) {
      console.error('Database initialization failed');
      console.error('_lastParams', this._lastParams);
      alert('IndexedDB INIT Error');
      throw new Error(e);
    }

    this.isReady$.next(true);
    return this.db;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private async _errorHandler(e: Error, fn: Function, args: any[]): Promise<void> {
    devError(e);
    if (confirm(this._translateService.instant(T.CONFIRM.RELOAD_AFTER_IDB_ERROR))) {
      this._restartApp();
    } else {
      this.db?.close();
      await this._init();
      // retry after init
      return fn(...args);
    }
  }

  private _restartApp(): void {
    if (IS_ELECTRON) {
      this._electronService.remote?.app.relaunch();
      this._electronService.remote?.app.exit(0);
    } else {
      window.location.reload();
    }
  }

  private async _afterReady(): Promise<boolean> {
    try {
      return await this._afterReady$.pipe(take(1)).toPromise();
    } catch (e) {
      console.warn('DB After Ready Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }
}
