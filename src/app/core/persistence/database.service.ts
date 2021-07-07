import { Injectable } from '@angular/core';
import { DBSchema, openDB } from 'idb';
import { IDBPDatabase } from 'idb/build/esm/entry';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, shareReplay, take } from 'rxjs/operators';
import { retry } from 'utils-decorators';

const DB_NAME = 'SUP';
const DB_MAIN_NAME = 'SUP_STORE';
const VERSION = 2;
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 30;

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

  constructor() {
    this._init().then();
  }

  @retry({ retries: MAX_RETRY_COUNT, delay: RETRY_DELAY })
  async load(key: string): Promise<unknown> {
    this._lastParams = { a: 'load', key };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).get(DB_MAIN_NAME, key);
    } catch (e) {
      console.warn('DB Load Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }

  @retry({ retries: MAX_RETRY_COUNT, delay: RETRY_DELAY })
  async save(key: string, data: unknown): Promise<unknown> {
    this._lastParams = { a: 'save', key, data };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).put(DB_MAIN_NAME, data, key);
    } catch (e) {
      console.warn('DB Save Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }

  @retry({ retries: MAX_RETRY_COUNT, delay: RETRY_DELAY })
  async remove(key: string): Promise<unknown> {
    this._lastParams = { a: 'remove', key };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).delete(DB_MAIN_NAME, key);
    } catch (e) {
      console.warn('DB Remove Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }

  @retry({ retries: MAX_RETRY_COUNT, delay: RETRY_DELAY })
  async clearDatabase(): Promise<unknown> {
    this._lastParams = { a: 'clearDatabase' };
    await this._afterReady();
    try {
      return await (this.db as IDBPDatabase<MyDb>).clear(DB_MAIN_NAME);
    } catch (e) {
      console.warn('DB Clear Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }

  @retry({ retries: MAX_RETRY_COUNT, delay: RETRY_DELAY })
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
        blocked() {
          alert('IDB BLOCKED');
        },
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        blocking() {
          alert('IDB BLOCKING');
        },
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        terminated() {
          alert('IDB TERMINATED');
          if (
            confirm(
              'App database was terminated :( Is there enough free disk space or some process messing with the data? Press OK to reload the app.',
            )
          ) {
            window.location.reload();
          }
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

  private async _afterReady(): Promise<boolean> {
    try {
      return await this._afterReady$.pipe(take(1)).toPromise();
    } catch (e) {
      console.warn('DB After Ready Error: Last Params,', this._lastParams);
      throw new Error(e);
    }
  }
}
