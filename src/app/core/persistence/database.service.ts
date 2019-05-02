import { Injectable } from '@angular/core';
import * as localForage from 'localforage';
import { SnackService } from '../snack/snack.service';

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
      this._snackService.open({type: 'ERROR', msg: 'Error while loading data'});
    }
  }

  async save(key: string, data: any): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.setItem(key, data));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: 'Error while saving data'});
    }
  }

  async remove(key: string): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.removeItem(key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: 'Error while deleting data'});
    }
  }

  async clearDatabase(): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.clear());
    } catch (e) {
      this._snackService.open({type: 'ERROR', msg: 'Error while deleting data'});
    }
  }

  private _init() {
    localForage.config({
      driver: localForage.INDEXEDDB, // Force WebSQL; same as using setDriver()
      name: 'SUP',
      // version: 1.0,
      storeName: 'SUP_STORE', // Should be alphanumeric, with underscores.
      description: 'All data for Super Productivity 2'
    });
  }
}
