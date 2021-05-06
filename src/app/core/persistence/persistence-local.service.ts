import { Injectable } from '@angular/core';
import {
  LS_LOCAL_NON_SYNC,
  LS_SYNC_LAST_LOCAL_REVISION,
  LS_SYNC_LOCAL_LAST_SYNC,
} from './ls-keys.const';
import { DatabaseService } from './database.service';
import { LocalSyncMetaModel } from '../../imex/sync/sync.model';
import { SyncProvider } from '../../imex/sync/sync-provider.model';

@Injectable({
  providedIn: 'root',
})
export class PersistenceLocalService {
  constructor(private _databaseService: DatabaseService) {}

  async save(data: LocalSyncMetaModel): Promise<any> {
    return await this._databaseService.save(LS_LOCAL_NON_SYNC, data);
  }

  async load(): Promise<LocalSyncMetaModel> {
    const r = (await this._databaseService.load(LS_LOCAL_NON_SYNC)) as LocalSyncMetaModel;
    if (
      r &&
      r[SyncProvider.Dropbox] &&
      r[SyncProvider.GoogleDrive] &&
      r[SyncProvider.WebDAV]
    ) {
      return r;
    }
    return {
      [SyncProvider.Dropbox]: {
        rev: this._getLegacyLocalRev(SyncProvider.Dropbox) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.Dropbox) || 0,
      },
      [SyncProvider.GoogleDrive]: {
        rev: this._getLegacyLocalRev(SyncProvider.GoogleDrive) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.GoogleDrive) || 0,
      },
      [SyncProvider.WebDAV]: {
        rev: this._getLegacyLocalRev(SyncProvider.WebDAV) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.WebDAV) || 0,
      },
    };
  }

  private _getLegacyLocalRev(p: SyncProvider): string | null {
    return localStorage.getItem(LS_SYNC_LAST_LOCAL_REVISION + p);
  }

  private _getLegacyLocalLastSync(p: SyncProvider): number {
    const it = +(localStorage.getItem(LS_SYNC_LOCAL_LAST_SYNC + p) as any);
    return isNaN(it) ? 0 : it || 0;
  }
}
