import {Injectable} from '@angular/core';
import {SnackService} from '../snack/snack.service';
import {DBSchema, openDB} from 'idb';
import {IDBPDatabase} from 'idb/build/esm/entry';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, shareReplay, take} from 'rxjs/operators';

const DB_NAME = 'SUP';
const DB_MAIN_NAME = 'SUP_STORE';
const VERSION = 2;

interface MyDb extends DBSchema {
  [key: string]: any;

  [DB_MAIN_NAME]: any;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  db: IDBPDatabase<MyDb>;
  isReady$ = new BehaviorSubject<boolean>(false);

  private _afterReady$: Observable<boolean> = this.isReady$.pipe(
    filter(isReady => isReady),
    shareReplay(1),
  );

  constructor(
    private _snackService: SnackService,
  ) {
    this._init().then();
  }

  async load(key: string): Promise<any> {
    await this._afterReady();
    return await this.db.get(DB_MAIN_NAME, key);
  }

  async save(key: string, data: any): Promise<any> {
    await this._afterReady();
    return await this.db.put(DB_MAIN_NAME, data, key);
  }

  async remove(key: string): Promise<any> {
    await this._afterReady();
    return await this.db.delete(DB_MAIN_NAME, key);
  }

  async clearDatabase(): Promise<any> {
    await this._afterReady();
    return await this.db.clear(DB_MAIN_NAME);
  }

  private async _init() {
    try {
      this.db = await openDB<MyDb>(DB_NAME, VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
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
      throw new Error(e);
    }

    this.isReady$.next(true);
    return this.db;
  }

  private _afterReady(): Promise<boolean> {
    return this._afterReady$.pipe(take(1)).toPromise();
  }
}
