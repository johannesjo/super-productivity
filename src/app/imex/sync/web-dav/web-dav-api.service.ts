import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { first, map, switchMap, tap } from 'rxjs/operators';
import { WebDavConfig } from '../../../features/config/global-config.model';
// @ts-ignore
import { createClient } from 'webdav/web';
import { AppDataComplete } from '../sync.model';

@Injectable({providedIn: 'root'})
export class WebDavApiService {
  private _cfg$: Observable<WebDavConfig> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.sync.webDav)
  );

  isAllConfigDataAvailable$: Observable<boolean> = this._cfg$.pipe(
    map((cfg) => !!(cfg && cfg.userName && cfg.baseUrl && cfg.syncFilePath && cfg.password)),
  );

  private _isReady$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => this.isAllConfigDataAvailable$),
    tap((isTokenAvailable) => !isTokenAvailable && new Error('WebDAV API not ready')),
    first(),
  );

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
  ) {
  }

  async upload({localRev, data, isForceOverwrite = false}: {
    localRev?: string | null;
    data: AppDataComplete;
    isForceOverwrite?: boolean;
  }): Promise<unknown> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });

    const r = await client.putFileContents('/' + cfg.syncFilePath, JSON.stringify(data));
    console.log(r);
    return r;
  }

  async getMetaData(path: string): Promise<{
    basename: string,
    etag: string,
    filename: string,
    lastmod: string,
    mime: string,
    size: number
    type: string,
  }> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.stat(path);
    console.log(r);
    return r;
  }

  async download({path, localRev}: { path: string; localRev?: string | null }): Promise<AppDataComplete> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.getFileContents(path, {format: 'text'});
    console.log(r);
    return r;
  }

  //
  // async checkUser(accessToken: string): Promise<unknown> {
  //   await this._isReady$.toPromise();
  //   return this._request({
  //     accessToken,
  //     method: 'POST',
  //     url: 'https://api.dropboxapi.com/2/check/user',
  //   }).then((res) => res.data);
  // }
  //

  // async upload({path, localRev, data, clientModified, isForceOverwrite = false}: {
  //   path: string;
  //   clientModified?: number;
  //   localRev?: string | null;
  //   data: any;
  //   isForceOverwrite?: boolean;
  // }): Promise<unknown> {
  //   await this._isReady$.toPromise();
  //   const cfg = await this._cfg$.pipe(first()).toPromise();
  //
  //   const args = {
  //   };
  //
  //   // if (localRev && !isForceOverwrite) {
  //   // }
  //
  //   return this._request({
  //     method: 'POST',
  //     url:  `${cfg.baseUrl}`,
  //     data,
  //     headers: {
  //       // 'Content-Type': 'application/octet-stream',
  //     },
  //   }).then((res) => res.data);
  // }
  //
  // async _request({url, method = 'GET', data, headers = {}, params = {}}: {
  //   url: string;
  //   method?: Method;
  //   headers?: { [key: string]: any },
  //   data?: string | object
  //   params?: { [key: string]: string },
  // }): Promise<AxiosResponse> {
  //   await this._isReady$.toPromise();
  //   const cfg = await this._cfg$.pipe(first()).toPromise();
  //
  //   return axios.request({
  //     url: params
  //       ? url + stringify(params)
  //       : url,
  //     method,
  //     data,
  //     headers: {
  //       authorization: `Authorization ${cfg.userName}:${cfg.password}`,
  //       'Content-Type': 'application/json;charset=UTF-8',
  //       ...headers,
  //     },
  //   });
  // }
}
