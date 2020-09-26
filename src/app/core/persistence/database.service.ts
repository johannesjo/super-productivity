import { Injectable } from '@angular/core';
import { DBSchema, IDBPTransaction, openDB } from 'idb';
import { IDBPDatabase } from 'idb/build/esm/entry';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, shareReplay, take } from 'rxjs/operators';

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
    filter(isReady => isReady),
    shareReplay(1),
  );

  private _lastParams?: { a: string; key?: string, data?: unknown };

  constructor() {
    this._init().then();
  }

  async load(key: string): Promise<unknown> {
    this._lastParams = {a: 'load', key};
    await this._afterReady();
    return await (this.db as IDBPDatabase<MyDb>).get(DB_MAIN_NAME, key);
  }

  async save(key: string, data: unknown): Promise<unknown> {
    this._lastParams = {a: 'save', key, data};
    await this._afterReady();
    return await (this.db as IDBPDatabase<MyDb>).put(DB_MAIN_NAME, data, key);
  }

  async remove(key: string): Promise<unknown> {
    this._lastParams = {a: 'remove', key};
    await this._afterReady();
    return await (this.db as IDBPDatabase<MyDb>).delete(DB_MAIN_NAME, key);
  }

  async clearDatabase(): Promise<unknown> {
    this._lastParams = {a: 'clearDatabase'};
    await this._afterReady();
    return await (this.db as IDBPDatabase<MyDb>).clear(DB_MAIN_NAME);
  }

  private async _init() {
    try {
      this.db = await openDB<MyDb>(DB_NAME, VERSION, {
        upgrade(db: IDBPDatabase<MyDb>, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction<MyDb>) {
          // …
          console.log('IDB UPGRADE', oldVersion, newVersion);
          db.createObjectStore(DB_MAIN_NAME);
        },
        blocked() {
          alert('IDB BLOCKED');
        },
        blocking() {
          alert('IDB BLOCKING');
        },
        terminated() {
          alert('IDB TERMINATED');
        },
      });
    } catch (e) {
      console.error('Database initialization failed');
      console.error('_lastParams', this._lastParams);
      alert('IndexedDB Error');
      throw new Error(e);
    }

    this.isReady$.next(true);
    return this.db;
  }

  private _afterReady(): Promise<boolean> {
    return this._afterReady$.pipe(take(1)).toPromise();
  }
}
