import {Injectable} from '@angular/core';
import {DROPBOX_APP_KEY, DROPBOX_APP_SECRET} from './dropbox.const';
import {GlobalConfigService} from '../config/global-config.service';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {DataInitService} from '../../core/data-init/data-init.service';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import axios, {AxiosResponse, Method} from 'axios';
import qs from 'qs';
import {DropboxFileMetadata} from './dropbox.model';
import {toDropboxIsoString} from './iso-date-without-ms.util.';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  authCode$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.authCode));

  private _accessToken$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.accessToken));

  isTokenAvailable$ = this._accessToken$.pipe(
    map((token) => !!token),
  );

  private _isReady$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => this.isTokenAvailable$),
    tap((isTokenAvailable) => !isTokenAvailable && new Error('Dropbox API not ready')),
    first(),
  );

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
    private  _httpClient: HttpClient,
  ) {
  }

  async getMetaData(path: string): Promise<DropboxFileMetadata> {
    await this._isReady$.toPromise();

    return this._request({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/files/get_metadata',
      data: {path},
    }).then((res) => res.data);
  }

  async download<T>({path, localRev}: { path: string; localRev?: string; }): Promise<{ meta: DropboxFileMetadata, data: T }> {
    await this._isReady$.toPromise();

    return this._request({
      method: 'GET',
      url: 'https://content.dropboxapi.com/2/files/download',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({path}),
        // NOTE: doesn't do much, because we really get to the cas where it would be useful
        ...(localRev ? {'If-None-Match': localRev} : {})
      },
    }).then((res) => {
      const meta = JSON.parse(res.headers['dropbox-api-result']);
      return {meta, data: res.data};
    });
  }


  async upload({path, localRev, data, clientModified}: {
    path: string;
    clientModified?: number;
    localRev?: string;
    data: any;
  }): Promise<DropboxFileMetadata> {
    await this._isReady$.toPromise();

    const args = {
      mode: {'.tag': 'overwrite'},
      path,
      mute: true,
      ...((typeof clientModified === 'number')
        // we need to use ISO 8601 "combined date and time representation" format:
        ? {client_modified: toDropboxIsoString(clientModified)}
        : {}),
    };

    if (localRev) {
      args.mode = {'.tag': 'update', update: localRev} as any;
    }

    return this._request({
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      data,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({path, ...args}),
      },
    }).then((res) => res.data);
  }

  async checkUser(accessToken: string): Promise<unknown> {
    await this._isReady$.toPromise();
    return this._request({
      accessToken,
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/check/user',
    }).then((res) => res.data);
  }

  async _request({url, method = 'GET', data, headers = {}, params = {}, accessToken}: {
    url: string;
    method?: Method;
    headers?: { [key: string]: any },
    data?: string | object
    params?: { [key: string]: string },
    accessToken?: string
  }): Promise<AxiosResponse> {
    await this._isReady$.toPromise();
    accessToken = accessToken || await this._accessToken$.pipe(first()).toPromise();

    return axios.request({
      url: params
        ? url + qs.stringify(params)
        : url,
      method,
      data,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json;charset=UTF-8',
        ...headers,
      },
    });
  }

  async getAccessTokenFromAuthCode(authCode: string): Promise<string> {
    return axios.request({
      url: 'https://api.dropboxapi.com/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      data: qs.stringify({
        code: authCode,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    }).then(res => {
      return res.data.access_token;
      // Not necessary as it is highly unlikely that we get a wrong on
      // const accessToken = res.data.access_token;
      // return this.checkUser(accessToken).then(() => accessToken);
    });
  }
}
