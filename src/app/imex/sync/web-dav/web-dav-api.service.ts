import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { first, map, switchMap, tap } from 'rxjs/operators';
// @ts-ignore
import { createClient } from 'webdav/web';
import { AppDataComplete } from '../sync.model';
import { WebDavHeadResponse } from './web-dav.model';

// const createClient = (...args: any) => ({
//   stat: async (a: any): Promise<any> => undefined,
//   getFileContents: async (a: any, b?: any): Promise<any> => undefined,
//   putFileContents: async (a: any, b?: any): Promise<any> => undefined,
// });

@Injectable({ providedIn: 'root' })
export class WebDavApiService {
  private _cfg$: Observable<{
    baseUrl: string;
    userName: string;
    password: string;
    syncFilePath: string;
  }> = this._globalConfigService.cfg$.pipe(
    map(
      (cfg) =>
        cfg?.sync.webDav as {
          baseUrl: string;
          userName: string;
          password: string;
          syncFilePath: string;
        },
    ),
  );

  isAllConfigDataAvailable$: Observable<boolean> = this._cfg$.pipe(
    map(
      (cfg) => !!(cfg && cfg.userName && cfg.baseUrl && cfg.syncFilePath && cfg.password),
    ),
  );

  private _isReady$: Observable<boolean> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this.isAllConfigDataAvailable$),
      tap((isTokenAvailable) => !isTokenAvailable && new Error('WebDAV API not ready')),
      first(),
    );

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
  ) {}

  async upload({
    data,
  }: {
    localRev?: string | null;
    data: AppDataComplete;
    isForceOverwrite?: boolean;
  }): Promise<void> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });

    return await client.putFileContents('/' + cfg.syncFilePath, JSON.stringify(data), {
      contentLength: false,
    });
  }

  async getMetaData(path: string): Promise<WebDavHeadResponse> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.customRequest(path, { method: 'HEAD' });
    console.log(r);
    return r.headers;
    // const r = (await client.stat(path)) as FileStat;
    // console.log(r);
    // return r;
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<AppDataComplete> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    const client = createClient(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.getFileContents(path, { format: 'text' });
    console.log(r);
    return r as any;
  }
}
