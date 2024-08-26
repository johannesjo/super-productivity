import { Injectable } from '@angular/core';
import { DB, LS } from './storage-keys.const';
import { DatabaseService } from './database.service';
import { LocalSyncMetaForProvider, LocalSyncMetaModel } from '../../imex/sync/sync.model';
import { SyncProvider } from 'src/app/imex/sync/sync-provider.model';

const DEFAULT_LOCAL_SYNC_META: LocalSyncMetaModel = {
  [SyncProvider.Dropbox]: {
    rev: null,
    lastSync: 0,
    revTaskArchive: null,
  },
  [SyncProvider.WebDAV]: { rev: null, lastSync: 0, revTaskArchive: null },
  [SyncProvider.LocalFile]: {
    rev: null,
    lastSync: 0,
    revTaskArchive: null,
  },
};

@Injectable({
  providedIn: 'root',
})
export class PersistenceLocalService {
  constructor(private _databaseService: DatabaseService) {}

  async save(data: LocalSyncMetaModel): Promise<unknown> {
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
      console.log(r);
      return r;
    }
    return DEFAULT_LOCAL_SYNC_META;
  }

  async updateDropboxSyncMeta(
    dropboxSyncMeta: Partial<LocalSyncMetaForProvider>,
  ): Promise<unknown> {
    const localSyncMeta = await this.load();
    return await this.save({
      ...localSyncMeta,
      Dropbox: {
        ...localSyncMeta.Dropbox,
        ...dropboxSyncMeta,
      },
    });
  }

  async loadLastSyncModelChange(): Promise<number> {
    const r =
      ((await this._databaseService.load(
        DB.LOCAL_LAST_SYNC_MODEL_CHANGE,
        // get legacy value if non here
      )) as string) || localStorage.getItem(LS.LAST_LOCAL_SYNC_MODEL_CHANGE);
    return this._parseTS(r);
  }

  async loadLastArchiveChange(): Promise<number> {
    return this._parseTS(
      (await this._databaseService.load(DB.LOCAL_LAST_ARCHIVE_CHANGE)) as string,
    );
  }

  async updateLastSyncModelChange(lastSyncModelChange: number): Promise<unknown> {
    return await this._databaseService.save(
      DB.LOCAL_LAST_SYNC_MODEL_CHANGE,
      lastSyncModelChange,
    );
  }

  async updateLastArchiveChange(lastArchiveChange: number): Promise<unknown> {
    return await this._databaseService.save(
      DB.LOCAL_LAST_ARCHIVE_CHANGE,
      lastArchiveChange,
    );
  }

  private _parseTS(ts: number | string | null): number {
    // NOTE: we need to parse because new Date('1570549698000') is "Invalid Date"
    const laParsed = Number.isNaN(Number(ts)) ? ts : +(ts as string);
    if (!laParsed) {
      return 0;
    }
    // NOTE: to account for legacy string dates
    return new Date(laParsed).getTime();
  }
}
