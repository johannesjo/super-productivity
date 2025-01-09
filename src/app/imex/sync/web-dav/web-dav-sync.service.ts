import { Injectable, inject } from '@angular/core';
import {
  SyncProvider,
  SyncProviderServiceInterface,
  SyncTarget,
} from '../sync-provider.model';
import { SyncGetRevResult } from '../sync.model';

import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map } from 'rxjs/operators';
import { WebDavApiService } from './web-dav-api.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { WebDavConfig } from '../../../features/config/global-config.model';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { WebDavHeadResponse } from './web-dav.model';

@Injectable({ providedIn: 'root' })
export class WebDavSyncService implements SyncProviderServiceInterface {
  private _webDavApiService = inject(WebDavApiService);
  private _dataInitService = inject(DataInitService);
  private _globalConfigService = inject(GlobalConfigService);

  id: SyncProvider = SyncProvider.WebDAV;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._webDavApiService.isAllConfigDataAvailable$),
    distinctUntilChanged(),
  );

  private _cfg$: Observable<WebDavConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync.webDav),
  );

  async getFileRevAndLastClientUpdate(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    const cfg = await this._cfg$.pipe(first()).toPromise();

    try {
      const meta = await this._webDavApiService.getMetaData(
        this._getFilePath(syncTarget, cfg),
      );
      // @ts-ignore
      const d = new Date(meta['last-modified']);
      return {
        clientUpdate: d.getTime(),
        rev: this._getRevFromMeta(meta),
      };
    } catch (e: any) {
      const isAxiosError = !!(e?.response && e.response.status);
      if ((isAxiosError && e.response.status === 404) || e.status === 404) {
        return 'NO_REMOTE_DATA';
      }
      console.error(e);
      if (e instanceof Error) {
        throw new Error(e.message);
      } else {
        throw new Error('An unknown error occurred while getting file rev');
      }
    }
  }

  async downloadFileData(
    syncTarget: SyncTarget,
    localRev: string,
  ): Promise<{ rev: string; dataStr: string }> {
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const filePath = this._getFilePath(syncTarget, cfg);
    const r = await this._webDavApiService.download({
      path: filePath,
      localRev,
    });
    const meta = await this._webDavApiService.getMetaData(filePath);
    return {
      rev: this._getRevFromMeta(meta),
      dataStr: r,
    };
  }

  async uploadFileData(
    syncTarget: SyncTarget,
    dataStr: string,
    localRev: string,
    isForceOverwrite: boolean = false,
  ): Promise<string | Error> {
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const filePath = this._getFilePath(syncTarget, cfg);
    try {
      await this._webDavApiService.upload({
        path: filePath,
        data: dataStr,
      });
    } catch (e) {
      console.error(e);
      if (e?.toString?.().includes('404')) {
        // folder might not exist, so we try to create it
        await this._webDavApiService.createFolder({
          folderPath: cfg.syncFolderPath as string,
        });
        await this._webDavApiService.upload({
          path: filePath,
          data: dataStr,
        });
      }

      console.error(e);
      if (e instanceof Error) {
        throw new Error(e.message);
      } else {
        throw new Error('An unknown error occurred while uploading file');
      }
    }

    const meta = await this._webDavApiService.getMetaData(filePath);
    return this._getRevFromMeta(meta);
  }

  private _getRevFromMeta(meta: WebDavHeadResponse): string {
    if (typeof meta?.etag !== 'string') {
      console.warn('No etag for WebDAV');
    }
    const rev = meta.etag || meta['oc-etag'] || meta['last-modified'];
    if (!rev) {
      console.log(meta);
      throw new Error('Not able to get rev for WebDAV');
    }
    console.log('cleaned rev', this._cleanRev(rev));
    return this._cleanRev(rev);
  }

  private _cleanRev(rev: string): string {
    return rev.replace(/"/g, '').replace(/^W\//, '');
  }

  private _getFilePath(syncTarget: SyncTarget, cfg: WebDavConfig): string {
    return `${cfg.syncFolderPath as string}/${syncTarget}.json`;
  }
}
