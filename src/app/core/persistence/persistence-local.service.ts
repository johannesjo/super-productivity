import { Injectable } from '@angular/core';
import { DB } from './storage-keys.const';
import { DatabaseService } from './database.service';
import { LocalSyncMetaModel } from '../../imex/sync/sync.model';

@Injectable({
  providedIn: 'root',
})
export class PersistenceLocalService {
  constructor(private _databaseService: DatabaseService) {}

  async save(data: LocalSyncMetaModel): Promise<unknown> {
    return await this._databaseService.save(DB.LOCAL_NON_SYNC, data);
  }

  async load(): Promise<LocalSyncMetaModel> {
    return (await this._databaseService.load(DB.LOCAL_NON_SYNC)) as LocalSyncMetaModel;
  }
}
