import { Injectable } from '@angular/core';
import { IDBPDatabase } from 'idb/build';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, shareReplay, take } from 'rxjs/operators';
import { DBSchema, openDB } from 'idb';
import { DBAdapter } from './db-adapter.model';

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
export class IndexedDBAdapterService implements DBAdapter {
  private _db?: IDBPDatabase<MyDb>;
  private _isReady$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _afterReady$: Observable<boolean> = this._isReady$.pipe(
    filter((isReady) => isReady),
    shareReplay(1),
  );

  constructor() {}

  public async init(): Promise<IDBPDatabase<MyDb>> {
    try {
      this._db = await openDB<MyDb>(DB_NAME, VERSION, {
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
      this._isReady$.next(false);
      throw new Error(e as any);
    }

    this._isReady$.next(true);
    return this._db;
  }

  async teardown(): Promise<void> {
    this._db?.close();
  }

  async load(key: string): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).get(DB_MAIN_NAME, key);
  }

  async save(key: string, data: unknown): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).put(DB_MAIN_NAME, data, key);
  }

  async remove(key: string): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).delete(DB_MAIN_NAME, key);
  }

  async clearDatabase(): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).clear(DB_MAIN_NAME);
  }

  private async _afterReady(): Promise<boolean> {
    try {
      return await this._afterReady$.pipe(take(1)).toPromise();
    } catch (e) {
      console.warn('DB After Ready Error: Last Params');
      throw new Error(e as string);
    }
  }
}
