import { Injectable } from '@angular/core';

const LS_SYNC_INTERVAL = 1000;

@Injectable({
  providedIn: 'root'
})
export class AppStorageService {

  constructor() {
  }

  initLsSync() {
    setInterval(this.saveToLs, LS_SYNC_INTERVAL);
  }

  saveToLs() {
    console.log('SYNC');

  }
}
