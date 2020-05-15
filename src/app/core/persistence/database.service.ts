import {Injectable} from '@angular/core';
import {SnackService} from '../snack/snack.service';
import {T} from '../../t.const';
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
    try {
      return this._afterReady().then(() => this.db.get(DB_MAIN_NAME, key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_LOAD});
    }
  }

  async save(key: string, data: any): Promise<any> {
    try {
      return this._afterReady().then(() => this.db.put(DB_MAIN_NAME, key, data));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_SAVE});
    }
  }

  async remove(key: string): Promise<any> {
    try {
      return this._afterReady().then(() => this.db.delete(DB_MAIN_NAME, key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_DELETE});
    }
  }

  async clearDatabase(): Promise<any> {
    try {
      return this._afterReady().then(() => this.db.clear(DB_MAIN_NAME));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_CLEAR});
    }
  }

  private async _init() {
    this.db = await openDB<MyDb>(DB_NAME, VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // …
        console.log('IDB UPGRADE', oldVersion, newVersion);
        db.createObjectStore(DB_MAIN_NAME);
      },
      blocked() {
        this.isReady$.next(false);
        alert('IDB BLOCKED');
      },
      blocking() {
        this.isReady$.next(false);
        alert('IDB BLOCKING');
      },
      terminated() {
        this.isReady$.next(false);
        alert('IDB TERMINATED');
      },
    });
    this.isReady$.next(true);
    return this.db;
  }

  private _afterReady(): Promise<boolean> {
    return this._afterReady$.pipe(take(1)).toPromise();
  }
}
