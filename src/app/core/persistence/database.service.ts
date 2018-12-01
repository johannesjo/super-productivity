import { Injectable } from '@angular/core';
import * as localForage from 'localforage';
import { SnackService } from '../snack/snack.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  constructor(
    private _snackService: SnackService,
  ) {
    this._init();
  }

  async load(key: string): Promise<any> {
    try {
      return localForage.getItem(key);
    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Error while loading data'});
    }
  }

  async save(key: string, data: any): Promise<any> {
    try {
      return localForage.setItem(key, data);
    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Error while saving data'});
    }
  }

  async saveWithLastActive(key: string, data: any): Promise<any> {
    try {
      return localForage.setItem(key, data);
    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Error while saving data'});
    }
  }

  private _init() {
    localForage.config({
      driver: localForage.INDEXEDDB, // Force WebSQL; same as using setDriver()
      name: 'SUP',
      version: 1.0,
      storeName: 'SUP_STORE', // Should be alphanumeric, with underscores.
      description: 'All data for Super Productivity 2'
    });
  }

}
