import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map, tap } from 'rxjs/operators';
import { GlobalConfigService } from '../config/global-config.service';
import { GoogleDriveSyncConfig } from '../config/global-config.model';
import { DataImportService } from '../../imex/sync/data-import.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { AppDataComplete } from '../../imex/sync/sync.model';

import { T } from '../../t.const';
import { isValidAppData } from '../../imex/sync/is-valid-app-data.util';
import {
  LS_GOOGLE_LAST_LOCAL_REVISION,
  LS_GOOGLE_LOCAL_LAST_SYNC,
  LS_GOOGLE_LOCAL_LAST_SYNC_CHECK
} from '../../core/persistence/ls-keys.const';
import { SyncProvider, SyncProviderServiceInterface } from '../../imex/sync/sync-provider.model';
import { GoogleApiService } from './google-api.service';
import { CompressionService } from '../../core/compression/compression.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.GoogleDrive;

  cfg$: Observable<GoogleDriveSyncConfig> = this._configService.cfg$.pipe(map(cfg => cfg.sync.googleDriveSync));

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._googleApiService.isLoggedIn$),
    concatMap(() => this.cfg$.pipe(
      map(cfg => cfg.syncFileName === cfg._syncFileNameForBackupDocId && !!cfg._backupDocId)),
    ),
    distinctUntilChanged(),
  );

  isReadyForRequests$: Observable<boolean> = this.isReady$.pipe(
    tap((isReady) => !isReady && new Error('Google Drive Sync not ready')),
    first(),
  );

  constructor(
    private _configService: GlobalConfigService,
    private _dataImportService: DataImportService,
    private _googleApiService: GoogleApiService,
    private _dataInitService: DataInitService,
    private _compressionService: CompressionService,
    private _translateService: TranslateService,
  ) {
  }

  // NOTE: this does not include milliseconds, which could lead to uncool edge cases... :(
  async getRevAndLastClientUpdate(): Promise<{ rev: string; clientUpdate: number }> {
    const cfg = await this.cfg$.pipe(first()).toPromise();
    const fileId = cfg._backupDocId;
    const r: any = await this._googleApiService.getFileInfo$(fileId).pipe(first()).toPromise();
    const d = new Date(r.client_modified);
    return {
      clientUpdate: d.getTime(),
      rev: r.md5Checksum,
    };
  }

  async importAppData(data: AppDataComplete, rev: string) {
    if (!data) {
      const r = (await this.downloadAppData());
      data = r.data as AppDataComplete;
      rev = r.rev as string;
    }
    if (!rev) {
      throw new Error('No rev given');
    }

    await this._dataImportService.importCompleteSyncData(data);
    this.setLocalRev(rev);
    this.setLocalLastSync(data.lastLocalSyncModelChange);
    this.log('↓ Imported Data ↓ ✓');
  }

  async downloadAppData(): Promise<{ rev: string, data: AppDataComplete | undefined }> {
    const cfg = await this.cfg$.pipe(first()).toPromise();
    const {backup, meta} = await this._googleApiService.loadFile$(cfg._backupDocId).pipe(first()).toPromise();
    console.log(backup, meta);

    const data = !!backup
      ? await this._decodeAppDataIfNeeded(backup)
      : undefined;
    return {rev: meta.md5Checksum as string, data};
  }

  async uploadAppData(data: AppDataComplete, isForceOverwrite: boolean = false): Promise<unknown> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    let r: any;
    try {
      const cfg = await this.cfg$.pipe(first()).toPromise();
      console.log(cfg, data);

      const uploadData = cfg.isCompressData
        ? await this._compressionService.compressUTF16(JSON.stringify(data))
        : JSON.stringify(data);
      r = await this._googleApiService.saveFile$(uploadData, {
        title: cfg.syncFileName,
        id: cfg._backupDocId,
        editable: true,
        mimeType: cfg.isCompressData ? 'text/plain' : 'application/json',
      }).toPromise();

    } catch (e) {
      console.error(e);
      this.log('X Upload Request Error');
      if (this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
        return this.uploadAppData(data, true);
      }
    }
    if (!r.md5Checksum) {
      throw new Error('No md5Checksum');
    }

    this.setLocalRev(r.md5Checksum);
    this.setLocalLastSync(data.lastLocalSyncModelChange);
    this.log('↑ Uploaded Data ↑ ✓');
    return r;
  }

  log(...args: any | any[]) {
    return console.log('GD:', ...args);
  }

  // LS HELPER
  // ---------
  getLocalRev(): string | null {
    return localStorage.getItem(LS_GOOGLE_LAST_LOCAL_REVISION);
  }

  setLocalRev(rev: string) {
    if (!rev) {
      throw new Error('No rev given');
    }

    return localStorage.setItem(LS_GOOGLE_LAST_LOCAL_REVISION, rev);
  }

  getLocalLastSync(): number {
    const it = +(localStorage.getItem(LS_GOOGLE_LOCAL_LAST_SYNC) as any);
    return isNaN(it)
      ? 0
      : it || 0;
  }

  setLocalLastSync(localLastSync: number) {
    if (typeof (localLastSync as any) !== 'number') {
      throw new Error('No correct localLastSync given');
    }
    return localStorage.setItem(LS_GOOGLE_LOCAL_LAST_SYNC, localLastSync.toString());
  }

  updateLocalLastSyncCheck() {
    localStorage.setItem(LS_GOOGLE_LOCAL_LAST_SYNC_CHECK, Date.now().toString());
  }

  private async _decodeAppDataIfNeeded(backupStr: string | AppDataComplete): Promise<AppDataComplete> {
    let backupData: AppDataComplete | undefined;

    // we attempt this regardless of the option, because data might be compressed anyway
    if (typeof backupStr === 'string') {
      try {
        backupData = JSON.parse(backupStr) as AppDataComplete;
      } catch (e) {
        try {
          const decompressedData = await this._compressionService.decompressUTF16(backupStr);
          backupData = JSON.parse(decompressedData) as AppDataComplete;
        } catch (e) {
          console.error('Drive Sync, invalid data');
          console.warn(e);
        }
      }
    }
    return backupData || (backupStr as AppDataComplete);
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  };
}
