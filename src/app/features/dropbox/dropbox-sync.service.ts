import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, take, tap } from 'rxjs/operators';
import { DropboxApiService } from './dropbox-api.service';
import { DROPBOX_SYNC_FILE_PATH } from './dropbox.const';
import { AppDataComplete } from '../../imex/sync/sync.model';
import { SyncService } from '../../imex/sync/sync.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import {
  LS_DROPBOX_LAST_LOCAL_REVISION,
  LS_DROPBOX_LOCAL_LAST_SYNC,
  LS_DROPBOX_LOCAL_LAST_SYNC_CHECK
} from '../../core/persistence/ls-keys.const';
import { DropboxFileMetadata } from './dropbox.model';
import { DataImportService } from '../../imex/sync/data-import.service';
import { SnackService } from '../../core/snack/snack.service';
import { environment } from '../../../environments/environment';
import { T } from '../../t.const';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import { TranslateService } from '@ngx-translate/core';
import { SyncProvider, SyncProviderServiceInterface } from '../../imex/sync/sync-provider.model';

@Injectable({providedIn: 'root'})
export class DropboxSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.Dropbox;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._dropboxApiService.isTokenAvailable$),
    distinctUntilChanged(),
  );

  isReadyForRequests$: Observable<boolean> = this.isReady$.pipe(
    tap((isReady) => !isReady && new Error('Dropbox Sync not ready')),
    first(),
  );

  constructor(
    private _dataImportService: DataImportService,
    private _syncService: SyncService,
    private _dropboxApiService: DropboxApiService,
    private _dataInitService: DataInitService,
    private _snackService: SnackService,
    private _translateService: TranslateService,
  ) {
  }

  log(...args: any | any[]) {
    return console.log('DBX:', ...args);
  }

  async importAppData(data: AppDataComplete, rev: string) {
    if (!data) {
      const r = (await this.downloadAppData());
      data = r.data;
      rev = r.rev;
    }
    if (!rev) {
      throw new Error('No rev given');
    }

    await this._dataImportService.importCompleteSyncData(data);
    this.setLocalRev(rev);
    this.setLocalLastSync(data.lastLocalSyncModelChange);
    this.log('DBX: ↓ Imported Data ↓ ✓');
  }

  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  async getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number } | null> {
    try {
      const r = await this._dropboxApiService.getMetaData(DROPBOX_SYNC_FILE_PATH);
      const d = new Date(r.client_modified);
      return {
        clientUpdate: d.getTime(),
        rev: r.rev,
      };
    } catch (e) {
      const isAxiosError = !!(e && e.response && e.response.status);
      if (isAxiosError && e.response.data && e.response.data.error_summary === 'path/not_found/..') {
        this.log('DBX: File not found => ↑↑↑ Initial Upload ↑↑↑');
        const local = await this._syncService.inMemoryComplete$.pipe(take(1)).toPromise();
        await this.uploadAppData(local);
      } else if (isAxiosError && e.response.status === 401) {
        this._snackService.open({msg: T.F.DROPBOX.S.AUTH_ERROR, type: 'ERROR'});
      } else {
        console.error(e);
        if (environment.production) {
          this._snackService.open({
            msg: T.F.DROPBOX.S.UNKNOWN_ERROR,
            translateParams: {errorStr: e && e.toString && e.toString()},
            type: 'ERROR'
          });
        } else {
          throw new Error('DBX: Unknown error');
        }
      }
    }
    return null;
  }

  async downloadAppData(): Promise<{ rev: string, data: AppDataComplete }> {
    const r = await this._dropboxApiService.download<AppDataComplete>({
      path: DROPBOX_SYNC_FILE_PATH,
      localRev: this.getLocalRev(),
    });
    return {
      rev: r.meta.rev,
      data: r.data,
    };
  }

  async uploadAppData(data: AppDataComplete, isForceOverwrite: boolean = false): Promise<DropboxFileMetadata | undefined> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    try {
      const r = await this._dropboxApiService.upload({
        path: DROPBOX_SYNC_FILE_PATH,
        data,
        clientModified: data.lastLocalSyncModelChange,
        localRev: this.getLocalRev(),
        isForceOverwrite
      });
      this.setLocalRev(r.rev);
      this.setLocalLastSync(data.lastLocalSyncModelChange);
      this.log('DBX: ↑ Uploaded Data ↑ ✓');
      return r;
    } catch (e) {
      console.error(e);
      this.log('DBX: X Upload Request Error');
      if (this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
        return this.uploadAppData(data, true);
      }
    }
    return;
  }

  // LS HELPER
  // ---------
  getLocalRev(): string | null {
    return localStorage.getItem(LS_DROPBOX_LAST_LOCAL_REVISION);
  }

  setLocalRev(rev: string) {
    if (!rev) {
      throw new Error('No rev given');
    }

    return localStorage.setItem(LS_DROPBOX_LAST_LOCAL_REVISION, rev);
  }

  getLocalLastSync(): number {
    const it = +(localStorage.getItem(LS_DROPBOX_LOCAL_LAST_SYNC) as any);
    return isNaN(it)
      ? 0
      : it || 0;
  }

  setLocalLastSync(localLastSync: number) {
    if (typeof (localLastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given');
    }
    return localStorage.setItem(LS_DROPBOX_LOCAL_LAST_SYNC, localLastSync.toString());
  }

  updateLocalLastSyncCheck() {
    localStorage.setItem(LS_DROPBOX_LOCAL_LAST_SYNC_CHECK, Date.now().toString());
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  };

}
