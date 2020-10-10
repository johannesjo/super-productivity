import { Injectable } from '@angular/core';
import { SyncProvider, SyncProviderServiceInterface } from '../sync-provider.model';
import { TranslateService } from '@ngx-translate/core';
import { AppDataComplete } from '../sync.model';
import { isValidAppData } from '../is-valid-app-data.util';

import { Observable } from 'rxjs';
import { concatMap, distinctUntilChanged, first, map, tap } from 'rxjs/operators';
import { WebDavApiService } from './web-dav-api.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { environment } from '../../../../environments/environment';
import { T } from '../../../t.const';
import { WebDavConfig } from '../../../features/config/global-config.model';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { SnackService } from '../../../core/snack/snack.service';

@Injectable({providedIn: 'root'})
export class WebDavSyncService implements SyncProviderServiceInterface {
  id: SyncProvider = SyncProvider.WebDAV;

  isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    concatMap(() => this._webDavApiService.isAllConfigDataAvailable$),
    distinctUntilChanged(),
  );

  isReadyForRequests$: Observable<boolean> = this.isReady$.pipe(
    tap((isReady) => !isReady && new Error('WebDAV Sync not ready')),
    first(),
  );

  private _cfg$: Observable<WebDavConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync.webDav)
  );

  //
  constructor(
    private _webDavApiService: WebDavApiService,
    private _dataInitService: DataInitService,
    private _snackService: SnackService,
    private _globalConfigService: GlobalConfigService,
    private _translateService: TranslateService,
  ) {
  }

  log(...args: any | any[]) {
    return console.log('WebDAV:', ...args);
  }

  async getRevAndLastClientUpdate(localRev: string): Promise<{ rev: string; clientUpdate: number } | null> {
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
        return null;
      }
      console.error(e);
      if (environment.production) {
        this._snackService.open({
          msg: T.F.SYNC.S.UNKNOWN_ERROR,
          translateParams: {errorStr: e && e.toString && e.toString()},
          type: 'ERROR'
        });
      } else {
        throw new Error('WebDAV: Unknown error');
      }
    }
    return null;
  }

  async downloadAppData(localRev: string): Promise<{ rev: string, data: AppDataComplete }> {
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const r = await this._webDavApiService.download({
      path: cfg.syncFilePath as string,
      localRev,
    });
    const meta = await this._webDavApiService.getMetaData('/' + cfg.syncFilePath);

    return {
      rev: meta.etag,
      data: r,
    };
  }

  async uploadAppData(data: AppDataComplete, localRev: string, isForceOverwrite: boolean = false): Promise<string | null> {
    if (!isValidAppData(data)) {
      console.log(data);
      alert('The data you are trying to upload is invalid');
      throw new Error('The data you are trying to upload is invalid');
    }

    try {
      const r = await this._webDavApiService.upload({
        data,
        localRev,
        isForceOverwrite
      });
      console.log(r);

      this.log('↑ Uploaded Data ↑ ✓');
      // return rev;
      return 'rev';
    } catch (e) {
      console.error(e);
      this.log('X Upload Request Error');
      if (this._c(T.F.SYNC.C.FORCE_UPLOAD_AFTER_ERROR)) {
        return this.uploadAppData(data, localRev, true);
      }
    }
    return null;
  }

  private _c(str: string): boolean {
    return confirm(this._translateService.instant(str));
  };
}
