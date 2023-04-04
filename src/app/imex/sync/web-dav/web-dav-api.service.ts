import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { first, map, switchMap, tap } from 'rxjs/operators';
// @ts-ignore
import { createClient } from 'webdav/web';
import { WebDavHeadResponse } from './web-dav.model';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { androidInterface } from '../../../features/android/android-interface';
import { IncomingHttpHeaders } from 'http';

// const createClient = (...args: any) => ({
//   stat: async (a: any): Promise<any> => undefined,
//   getFileContents: async (a: any, b?: any): Promise<any> => undefined,
//   putFileContents: async (a: any, b?: any): Promise<any> => undefined,
// });

interface AndroidHttpResponse {
  data: string;
  status: number;
  headers: IncomingHttpHeaders;
  statusText: string;
}

export interface AndroidWebDAVClientError extends Error {
  status?: number;
  response?: AndroidHttpResponse;
}

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

  private checkErrorAndroid(result: AndroidHttpResponse): void {
    if (result.status < 200 || result.status > 299) {
      const error = new Error(
        `Invalid response: ${result.status} ${result.statusText}`,
      ) as AndroidWebDAVClientError;
      error.status = result.status;
      error.response = result;
      throw error;
    }
  }

  async upload({ data, path }: { data: string; path: string }): Promise<void> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
      const result = (await androidInterface.makeHttpRequestWrapped(
        cfg.baseUrl + '/' + path,
        'PUT',
        JSON.stringify(data),
        cfg.userName,
        cfg.password,
        false,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
    } else {
      const client = createClient(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });

      return await client.putFileContents(path, JSON.stringify(data), {
        contentLength: false,
      });
    }
  }

  async getMetaData(path: string): Promise<WebDavHeadResponse> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
      const result = (await androidInterface.makeHttpRequestWrapped(
        cfg.baseUrl + '/' + path,
        'HEAD',
        '',
        cfg.userName,
        cfg.password,
        false,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
      return result.headers as WebDavHeadResponse;
    } else {
      const client = createClient(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });
      const r = await client.customRequest(path, { method: 'HEAD' });
      return r.headers;
    }
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<string> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
      const result = (await androidInterface.makeHttpRequestWrapped(
        cfg.baseUrl + '/' + path,
        'GET',
        '',
        cfg.userName,
        cfg.password,
        true,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
      return JSON.parse(result.data);
    } else {
      const client = createClient(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });
      const r = await client.getFileContents(path, { format: 'text' });
      return r as any;
    }
  }
}
