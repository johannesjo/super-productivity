import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map } from 'rxjs/operators';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { GoogleDriveSyncConfig } from '../../../features/config/global-config.model';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { SyncGetRevResult } from '../sync.model';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
import { GoogleApiService } from './google-api.service';
import { CompressionService } from '../../../core/compression/compression.service';
import { IS_F_DROID_APP } from '../../../util/is-android-web-view';

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.GoogleDrive;

  cfg$: Observable<GoogleDriveSyncConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg.sync.googleDriveSync),
  );

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._googleApiService.isLoggedIn$),
    concatMap(() =>
      this.cfg$.pipe(
        map(
          (cfg) =>
            cfg.syncFileName === cfg._syncFileNameForBackupDocId && !!cfg._backupDocId,
        ),
      ),
    ),
    distinctUntilChanged(),
  );

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _googleApiService: GoogleApiService,
    private _dataInitService: DataInitService,
    private _compressionService: CompressionService,
  ) {
    // setInterval(() => {
    //   console.log('REQUEST!!!');
    //   if (IS_ELECTRON) {
    //   }
    // }, 45 * 1000);
  }

  async getRevAndLastClientUpdate(
    localRev: string,
  ): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    if (IS_F_DROID_APP) {
      throw new Error('Google Drive Sync not supported on FDroid');
    }

    const cfg = await this.cfg$.pipe(first()).toPromise();
    const fileId = cfg._backupDocId;
    const r: any = await this._googleApiService
      .getFileInfo$(fileId)
      .pipe(first())
      .toPromise();
    const d = new Date(r.client_modified);
    // TODO error handling if we happen to need it
    return {
      clientUpdate: d.getTime(),
      rev: r.md5Checksum,
    };
  }

  async downloadAppData(): Promise<{ rev: string; dataStr: string | undefined }> {
    if (IS_F_DROID_APP) {
      throw new Error('Google Drive Sync not supported on FDroid');
    }

    const cfg = await this.cfg$.pipe(first()).toPromise();
    const { backup, meta } = await this._googleApiService
      .loadFile$(cfg._backupDocId)
      .pipe(first())
      .toPromise();
    // console.log(backup, meta);

    return { rev: meta.md5Checksum as string, dataStr: backup };
  }

  async uploadAppData(
    dataStr: string,
    clientModified: number,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    if (IS_F_DROID_APP) {
      throw new Error('Google Drive Sync not supported on FDroid');
    }

    try {
      const cfg = await this.cfg$.pipe(first()).toPromise();
      // console.log(cfg, data);
      const r = await this._googleApiService
        .saveFile$(dataStr, {
          title: cfg.syncFileName,
          id: cfg._backupDocId,
          editable: true,
          mimeType: cfg.isCompressData ? 'text/plain' : 'application/json',
        })
        .toPromise();
      if (!(r as any).md5Checksum) {
        throw new Error('No md5Checksum');
      }
      return (r as any).md5Checksum;
    } catch (e) {
      console.error(e);
      // TODO fix error handling
      return e as any;
    }
  }
}
