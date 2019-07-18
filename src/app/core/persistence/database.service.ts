import {Injectable} from '@angular/core';
import * as localForage from 'localforage';
import {SnackService} from '../snack/snack.service';
import {T} from '../../t.const';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {

  constructor(
    private _snackService: SnackService,
  ) {
    this._init();
  }

  async load(key: string): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.getItem(key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_LOAD});
    }
  }

  async save(key: string, data: any): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.setItem(key, data));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_SAVE});
    }
  }

  async remove(key: string): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.removeItem(key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_DELETE});
    }
  }

  async clearDatabase(): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.clear());
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: T.GLOBAL_SNACK.ERR_DB_CLEAR});
    }
  }

  private _init() {
    localForage.config({
      driver: [localForage.INDEXEDDB, localForage.WEBSQL, localForage.LOCALSTORAGE],
      name: 'SUP',
      // version: 1.0,
      storeName: 'SUP_STORE', // Should be alphanumeric, with underscores.
      description: 'All data for Super Productivity 2'
    });
  }
}
