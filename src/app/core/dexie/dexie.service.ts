import Dexie from 'dexie';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DexieService extends Dexie {
  constructor() {
    super('Ng2DexieSample');
    this.version(1).stores({
      todos: '++id',
    });
  }
}
