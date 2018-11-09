import { Injectable } from '@angular/core';
import { AppDataComplete, SyncHandler } from './sync.model';
import { PersistenceService } from '../persistence/persistence.service';

// TODO some of this can be done in a background script

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  handlers: SyncHandler[];

  constructor(_persistenceService: PersistenceService) {
  }

  sync() {
  }

  registerSyncHandler(id: string, syncToFn: Function, syncFromFn: Function) {
    this.handlers.push({id, syncFromFn, syncToFn});
  }

  detachSyncHeandlerr(id: string) {
    this.handlers = this.handlers.filter(handler => handler.id !== id);
  }

  // private _getCompleteData(): AppDataComplete {
  //   return {
  //
  //   };
  // }
}
