import { Injectable } from '@angular/core';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
import { AppDataComplete, SyncGetRevResult } from '../sync.model';

import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map } from 'rxjs/operators';
import { WebDavApiService } from './web-dav-api.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { environment } from '../../../../environments/environment';
import { WebDavConfig } from '../../../features/config/global-config.model';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { GlobalProgressBarService } from '../../../core-ui/global-progress-bar/global-progress-bar.service';
import { T } from '../../../t.const';

@Injectable({providedIn: 'root'})
export class WebDavSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.WebDAV;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._webDavApiService.isAllConfigDataAvailable$),
    distinctUntilChanged(),
  );

  private _cfg$: Observable<WebDavConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync.webDav)
  );

  //
  constructor(
    private _webDavApiService: WebDavApiService,
    private _dataInitService: DataInitService,
    private _globalConfigService: GlobalConfigService,
    private _globalProgressBarService: GlobalProgressBarService,
  ) {
  }

  async getRevAndLastClientUpdate(localRev: string): Promise<{ rev: string; clientUpdate: number } | SyncGetRevResult> {
    const cfg = await this._cfg$.pipe(first()).toPromise();

    try {
      const r = await this._webDavApiService.getMetaData('/' + cfg.syncFilePath);
      const d = new Date(r.lastmod);
      return {
        clientUpdate: d.getTime(),
        rev: r.etag,
      };
    } catch (e) {
      const isAxiosError = !!(e && e.response && e.response.status);
      if (isAxiosError && e.response.status === 404) {
        return 'NO_REMOTE_DATA';
      }
      console.error(e);
      if (environment.production) {
        return e;
      } else {
        throw new Error('WebDAV: Unknown error');
      }
    }
  }

  async downloadAppData(localRev: string): Promise<{ rev: string; data: AppDataComplete }> {
    this._globalProgressBarService.countUp(T.GPB.WEB_DAV_DOWNLOAD);
    const cfg = await this._cfg$.pipe(first()).toPromise();
    try {
      const r = await this._webDavApiService.download({
        path: cfg.syncFilePath as string,
        localRev,
      });
      const meta = await this._webDavApiService.getMetaData('/' + cfg.syncFilePath);
      this._globalProgressBarService.countDown();
      return {
        rev: meta.etag,
        data: r,
      };
    } catch (e) {
      this._globalProgressBarService.countDown();
      return e;
    }
  }

  async uploadAppData(data: AppDataComplete, localRev: string, isForceOverwrite: boolean = false): Promise<string | Error> {
    this._globalProgressBarService.countUp(T.GPB.WEB_DAV_UPLOAD);
    try {
      const r = await this._webDavApiService.upload({
        data,
        localRev,
        isForceOverwrite
      });
      console.log(r);
      this._globalProgressBarService.countDown();
      return r.headers.etag;
    } catch (e) {
      console.error(e);
      this._globalProgressBarService.countDown();
      return e;
    }
  }
}
