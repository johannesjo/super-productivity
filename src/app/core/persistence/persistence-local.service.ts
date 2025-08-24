import { inject, Injectable, signal } from '@angular/core';
import { DB } from './storage-keys.const';
import { DatabaseService } from './database.service';
import { LocalSyncMetaForProvider, LocalSyncMetaModel } from '../../imex/sync/sync.model';
import { LegacySyncProvider } from 'src/app/imex/sync/legacy-sync-provider.model';
import { environment } from 'src/environments/environment';
import { Log } from '../log';

const DEFAULT_LOCAL_SYNC_META: LocalSyncMetaModel = {
  [LegacySyncProvider.Dropbox]: {
    rev: null,
    lastSync: 0,
    revTaskArchive: null,
  },
  [LegacySyncProvider.WebDAV]: { rev: null, lastSync: 0, revTaskArchive: null },
  [LegacySyncProvider.LocalFile]: {
    rev: null,
    lastSync: 0,
    revTaskArchive: null,
  },
};

@Injectable({
  providedIn: 'root',
})
export class PersistenceLocalService {
  lastSyncModelChange = signal(0);
  private _databaseService = inject(DatabaseService);

  constructor() {
    // update val initially
    this.loadLastSyncModelChange().then((val) => this.lastSyncModelChange.set(val));
  }

  async save(data: LocalSyncMetaModel): Promise<unknown> {
    return await this._databaseService.save(DB.LOCAL_NON_SYNC, data);
  }

  async load(): Promise<LocalSyncMetaModel> {
    const r = (await this._databaseService.load(DB.LOCAL_NON_SYNC)) as LocalSyncMetaModel;

    if (
      r &&
      r[LegacySyncProvider.Dropbox] &&
      r[LegacySyncProvider.WebDAV] &&
      r[LegacySyncProvider.LocalFile]
    ) {
      if (environment.production) {
        Log.log(r);
      }
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
    const r = (await this._databaseService.load(
      DB.LOCAL_LAST_SYNC_MODEL_CHANGE,
      // get legacy value if non here
      // TODO remove legacy value
    )) as string;
    return this._parseTS(r);
  }

  async loadLastArchiveChange(): Promise<number> {
    return this._parseTS(
      (await this._databaseService.load(DB.LOCAL_LAST_ARCHIVE_CHANGE)) as string,
    );
  }

  async updateLastSyncModelChange(lastSyncModelChange: number): Promise<unknown> {
    Log.log(lastSyncModelChange);
    console.trace();
    this.lastSyncModelChange.set(lastSyncModelChange);
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
