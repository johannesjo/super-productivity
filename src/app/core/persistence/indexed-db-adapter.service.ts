import { Injectable, signal } from '@angular/core';
import { IDBPDatabase } from 'idb/build';
import { DBSchema, openDB } from 'idb';
import { DBAdapter } from './db-adapter.model';
import { Log } from '../log';

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
  private _isReady = signal<boolean>(false);
  private _readyPromise?: Promise<void>;

  constructor() {}

  public async init(): Promise<IDBPDatabase<MyDb>> {
    // Create a promise that will resolve when the DB is ready
    this._readyPromise = new Promise<void>((resolve, reject) => {
      openDB<MyDb>(DB_NAME, VERSION, {
        // upgrade(db: IDBPDatabase<MyDb>, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction<MyDb>) {
        // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
        upgrade(db: IDBPDatabase<MyDb>, oldVersion: number, newVersion: number | null) {
          Log.log('IDB UPGRADE', oldVersion, newVersion);
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
      })
        .then((db) => {
          this._db = db;
          this._isReady.set(true);
          resolve();
        })
        .catch((e) => {
          this._isReady.set(false);
          reject(new Error(e as any));
        });
    });

    await this._readyPromise;
    return this._db as IDBPDatabase<MyDb>;
  }

  async teardown(): Promise<void> {
    this._db?.close();
  }

  async load(key: string): Promise<unknown> {
    await this._afterReady();

    try {
      const result = await (this._db as IDBPDatabase<MyDb>).get(DB_MAIN_NAME, key);
      return result;
    } catch (e) {
      Log.err(`[IndexedDB] Error loading key "${key}" from store "${DB_MAIN_NAME}":`, e);

      if (e instanceof Error) {
        Log.err('[IndexedDB] Error name:', e.name);
        Log.err('[IndexedDB] Error message:', e.message);

        // Log specific details for the large value error
        if (e.message && e.message.includes('Failed to read large IndexedDB value')) {
          Log.err('[IndexedDB] CRITICAL: Large value read failure detected');
          Log.err(
            '[IndexedDB] This indicates IndexedDB blob files are missing or corrupted',
          );
          Log.err('[IndexedDB] Affected store:', DB_MAIN_NAME);
          Log.err('[IndexedDB] Affected key:', key);
        }
      }

      throw e;
    }
  }

  async save(key: string, data: unknown): Promise<unknown> {
    await this._afterReady();

    try {
      return await (this._db as IDBPDatabase<MyDb>).put(DB_MAIN_NAME, data, key);
    } catch (e) {
      Log.err(`[IndexedDB] Error saving key "${key}" to store "${DB_MAIN_NAME}":`, e);
      throw e;
    }
  }

  async remove(key: string): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).delete(DB_MAIN_NAME, key);
  }

  async clearDatabase(): Promise<unknown> {
    await this._afterReady();
    return await (this._db as IDBPDatabase<MyDb>).clear(DB_MAIN_NAME);
  }

  private async _afterReady(): Promise<void> {
    if (!this._readyPromise) {
      throw new Error('Database not initialized. Call init() first.');
    }

    try {
      await this._readyPromise;
    } catch (e) {
      Log.err('DB After Ready Error: Last Params');
      throw new Error(e as string);
    }
  }
}
