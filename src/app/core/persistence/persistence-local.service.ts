import { Injectable } from '@angular/core';
import { DB, LS } from './storage-keys.const';
import { DatabaseService } from './database.service';
import { LocalSyncMetaModel } from '../../imex/sync/sync.model';
import { SyncProvider } from '../../imex/sync/sync-provider.model';

@Injectable({
  providedIn: 'root',
})
export class PersistenceLocalService {
  constructor(private _databaseService: DatabaseService) {}

  async save(data: LocalSyncMetaModel): Promise<any> {
    return await this._databaseService.save(DB.LOCAL_NON_SYNC, data);
  }

  async load(): Promise<LocalSyncMetaModel> {
    const r = (await this._databaseService.load(DB.LOCAL_NON_SYNC)) as LocalSyncMetaModel;
    if (
      r &&
      r[SyncProvider.Dropbox] &&
      r[SyncProvider.WebDAV] &&
      r[SyncProvider.LocalFile]
    ) {
      return r;
    }
    // TODO remove that
    return {
      [SyncProvider.Dropbox]: {
        rev: this._getLegacyLocalRev(SyncProvider.Dropbox) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.Dropbox) || 0,
      },
      [SyncProvider.WebDAV]: {
        rev: this._getLegacyLocalRev(SyncProvider.WebDAV) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.WebDAV) || 0,
      },
      [SyncProvider.LocalFile]: {
        rev: this._getLegacyLocalRev(SyncProvider.LocalFile) || null,
        lastSync: this._getLegacyLocalLastSync(SyncProvider.LocalFile) || 0,
      },
      // Overwrite with existing if given
      ...(r as any),
    };
  }

  private _getLegacyLocalRev(p: SyncProvider): string | null {
    return localStorage.getItem(LS.SYNC_LAST_LOCAL_REVISION_PREFIX + p);
  }

  private _getLegacyLocalLastSync(p: SyncProvider): number {
    const it = +(localStorage.getItem(LS.SYNC_LOCAL_LAST_SYNC_PREFIX + p) as any);
    return isNaN(it) ? 0 : it || 0;
  }
}
