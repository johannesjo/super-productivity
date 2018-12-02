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
      return localForage.ready().then(() => localForage.getItem(key));
    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Error while loading data'});
    }
  }

  async save(key: string, data: any): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.setItem(key, data));
    } catch (e) {
      this._snackService.open({type: 'ERROR', message: 'Error while saving data'});
    }
  }

  async saveWithLastActive(key: string, data: any): Promise<any> {
    try {
      return localForage.ready().then(() => localForage.setItem(key, data));
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

  // private _checkStorage() {
  //   const storage = navigator['webkitPersistentStorage'];
  //   if (storage) {
  //     storage.queryUsageAndQuota(
  //       function (usedBytes, grantedBytes) {
  //         console.log('webkitPersistentStorage: we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
  //         console.log('webkitPersistentStorage: storage left mb', (grantedBytes - usedBytes) / 1024 / 1024);
  //       },
  //       function (e) {
  //         console.log('webkitPersistentStorage: Error', e);
  //       }
  //     );
  //   }
  //
  //   if (navigator.storage) {
  //     navigator.storage.estimate().then(
  //       (value: StorageEstimate) => console.log(
  //         `storage: using`, value
  //       )
  //     );
  //   }
  // }
}
