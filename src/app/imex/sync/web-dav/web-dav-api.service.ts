import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConfigService } from '../../../features/config/global-config.service';
import { DataInitService } from '../../../core/data-init/data-init.service';
import { first, map, switchMap, tap } from 'rxjs/operators';

import { WebDavHeadResponse } from './web-dav.model';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { androidInterface } from '../../../features/android/android-interface';
import { IncomingHttpHeaders } from 'http';

// Get the Type, but keep the actual bundle payload out
// import type { createClient } from 'webdav';
import { createClient } from 'webdav/web';

type CreateClientType = typeof createClient;

// Lazyload the webdav bundle (when requested)
// const LazyWebDavCreateClient = (): Promise<CreateClientType> =>
//   import(/* webpackChunkName: "webdav-web" */ 'webdav/web').then(
//     ({ createClient }) => createClient as CreateClientType,
//   );

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
  private _globalConfigService = inject(GlobalConfigService);
  private _dataInitService = inject(DataInitService);

  private _cfg$: Observable<{
    baseUrl: string;
    userName: string;
    password: string;
    syncFolderPath: string;
  }> = this._globalConfigService.cfg$.pipe(
    map(
      (cfg) =>
        cfg?.sync.webDav as {
          baseUrl: string;
          userName: string;
          password: string;
          syncFolderPath: string;
        },
    ),
  );

  isAllConfigDataAvailable$: Observable<boolean> = this._cfg$.pipe(
    map(
      (cfg) =>
        !!(cfg && cfg.userName && cfg.baseUrl && cfg.syncFolderPath && cfg.password),
    ),
  );

  private _isReady$: Observable<boolean> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this.isAllConfigDataAvailable$),
      tap((isTokenAvailable) => !isTokenAvailable && new Error('WebDAV API not ready')),
      first(),
    );

  private getWebDavClientCreator(): Promise<CreateClientType> {
    return Promise.resolve(createClient);
    // return (
    // this._lazyWebDavClientCache ??
    // (this._lazyWebDavClientCache = LazyWebDavCreateClient())
    // );
  }

  private checkErrorAndroid(result: AndroidHttpResponse): void {
    console.log(result);

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
        this._getUrl(path, cfg),
        'PUT',
        data,
        // JSON.stringify(data),
        cfg.userName,
        cfg.password,
        false,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
    } else {
      const webDavClientCreator = await this.getWebDavClientCreator();

      const client = webDavClientCreator(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });

      await client.putFileContents(path, data, {
        contentLength: false,
      });
    }
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
      // // TODO check on real android
      // const result = (await androidInterface.makeHttpRequestWrapped(
      //   new URL(folderPath, cfg.baseUrl).toString(),
      //   'MKCOL',
      //   '',
      //   cfg.userName,
      //   cfg.password,
      //   false,
      // )) as AndroidHttpResponse;
      // this.checkErrorAndroid(result);
      console.warn('MCOL not working on Android');
      return Promise.resolve();
    } else {
      const webDavClientCreator = await this.getWebDavClientCreator();

      const client = webDavClientCreator(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });
      await client.createDirectory(folderPath, {
        recursive: true,
      });
    }
  }

  async getMetaData(path: string): Promise<WebDavHeadResponse> {
    await this._isReady$.toPromise();
    const cfg = await this._cfg$.pipe(first()).toPromise();
    if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
      const result = (await androidInterface.makeHttpRequestWrapped(
        this._getUrl(path, cfg),
        'HEAD',
        '',
        cfg.userName,
        cfg.password,
        false,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
      console.log({ result });
      return result.headers as WebDavHeadResponse;
    } else {
      const webDavClientCreator = await this.getWebDavClientCreator();

      const client = webDavClientCreator(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });
      const r = await client.customRequest(path, { method: 'HEAD' });
      console.log({ r });

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
        this._getUrl(path, cfg),
        'GET',
        '',
        cfg.userName,
        cfg.password,
        true,
      )) as AndroidHttpResponse;
      this.checkErrorAndroid(result);
      return result.data;
    } else {
      const webDavClientCreator = await this.getWebDavClientCreator();

      const client = webDavClientCreator(cfg.baseUrl, {
        username: cfg.userName,
        password: cfg.password,
      });
      const r = await client.getFileContents(path, { format: 'text' });
      return r as any;
    }
  }

  private _getUrl(
    path: string,
    cfg: {
      baseUrl: string;
      userName: string;
      password: string;
      syncFolderPath: string;
    },
  ): string {
    return new URL(
      path,
      cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`,
    ).toString();
  }
}
