/* eslint-disable @typescript-eslint/naming-convention */

// Get the Type, but keep the actual bundle payload out
// import type { createClient } from 'webdav';
import { createClient } from 'webdav/web';
import { SyncProviderServiceInterface } from '../sync-provider.interface';
import { IncomingHttpHeaders } from 'http';
import { WebDavHeadResponse } from '../../../../imex/sync/web-dav/web-dav.model';
import { WebdavCredentials } from './webdav';

type CreateClientType = typeof createClient;

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

export class WebdavApi {
  private _parent: SyncProviderServiceInterface<WebdavCredentials>;
  private _cfg: {
    baseUrl: string;
    userName: string;
    password: string;
    syncFolderPath: string;
  };

  constructor(parent: SyncProviderServiceInterface<WebdavCredentials>) {
    this._parent = parent;
  }

  private getWebDavClientCreator(): Promise<CreateClientType> {
    return Promise.resolve(createClient);
  }

  // TODO check better solution for this
  // private checkErrorAndroid(result: AndroidHttpResponse): void {
  //   console.log(result);
  //   if (result.status < 200 || result.status > 299) {
  //     const error = new Error(
  //       `Invalid response: ${result.status} ${result.statusText}`,
  //     ) as AndroidWebDAVClientError;
  //     error.status = result.status;
  //     error.response = result;
  //     throw error;
  //   }
  // }

  async upload({ data, path }: { data: string; path: string }): Promise<void> {
    const cfg = this._cfg;
    // TODO find better solution for this
    // if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
    //   const result = (await androidInterface.makeHttpRequestWrapped(
    //     this._getUrl(path, cfg),
    //     'PUT',
    //     data,
    //     // JSON.stringify(data),
    //     cfg.userName,
    //     cfg.password,
    //     false,
    //   )) as AndroidHttpResponse;
    //   this.checkErrorAndroid(result);
    // } else {
    const webDavClientCreator = await this.getWebDavClientCreator();

    const client = webDavClientCreator(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });

    await client.putFileContents(path, data, {
      contentLength: false,
    });
  }

  async createFolder({ folderPath }: { folderPath: string }): Promise<void> {
    const cfg = this._cfg;
    // if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
    //   // // TODO check on real android
    //   // const result = (await androidInterface.makeHttpRequestWrapped(
    //   //   new URL(folderPath, cfg.baseUrl).toString(),
    //   //   'MKCOL',
    //   //   '',
    //   //   cfg.userName,
    //   //   cfg.password,
    //   //   false,
    //   // )) as AndroidHttpResponse;
    //   // this.checkErrorAndroid(result);
    //   console.warn('MCOL not working on Android');
    //   return Promise.resolve();
    // } else {
    const webDavClientCreator = await this.getWebDavClientCreator();
    const client = webDavClientCreator(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    await client.createDirectory(folderPath, {
      recursive: true,
    });
    // }
  }

  async getFileMetaData(path: string): Promise<WebDavHeadResponse> {
    const cfg = this._cfg;
    // if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
    //   const result = (await androidInterface.makeHttpRequestWrapped(
    //     this._getUrl(path, cfg),
    //     'HEAD',
    //     '',
    //     cfg.userName,
    //     cfg.password,
    //     false,
    //   )) as AndroidHttpResponse;
    //   this.checkErrorAndroid(result);
    //   console.log({ result });
    //   return result.headers as WebDavHeadResponse;
    // } else {
    const webDavClientCreator = await this.getWebDavClientCreator();
    const client = webDavClientCreator(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.customRequest(path, { method: 'HEAD' });
    console.log({ r });
    return r.headers;
    // }
  }

  async download({
    path,
    localRev,
  }: {
    path: string;
    localRev?: string | null;
  }): Promise<string> {
    const cfg = this._cfg;
    // if (IS_ANDROID_WEB_VIEW && androidInterface.makeHttpRequest) {
    //   const result = (await androidInterface.makeHttpRequestWrapped(
    //     this._getUrl(path, cfg),
    //     'GET',
    //     '',
    //     cfg.userName,
    //     cfg.password,
    //     true,
    //   )) as AndroidHttpResponse;
    //   this.checkErrorAndroid(result);
    //   return result.data;
    // } else {
    const webDavClientCreator = await this.getWebDavClientCreator();
    const client = webDavClientCreator(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    const r = await client.getFileContents(path, { format: 'text' });
    return r as any;
    // }
  }

  async remove(filePath: string): Promise<void> {
    const cfg = this._cfg;
    const webDavClientCreator = await this.getWebDavClientCreator();
    const client = webDavClientCreator(cfg.baseUrl, {
      username: cfg.userName,
      password: cfg.password,
    });
    return await client.deleteFile(filePath);
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
