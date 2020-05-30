import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {DROPBOX_APP_KEY, DROPBOX_APP_SECRET} from './dropbox.const';
import {GlobalConfigService} from '../config/global-config.service';
import {delay, first, map, switchMap, tap} from 'rxjs/operators';
import {DataInitService} from '../../core/data-init/data-init.service';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import axios, {AxiosResponse, Method} from 'axios';
import qs from 'qs';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  accessCode$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.authCode));

  private _accessToken$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.accessToken));

  isTokenAvailable$ = this._accessToken$.pipe(
    map((token) => !!token),
    // delay so setAccessToken is definitely called
    delay(10),
  );

  isReady$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => this.isTokenAvailable$),
    tap((isTokenAvailable) => !isTokenAvailable && new Error('Dropbox API not ready')),
    first(),
  );

  private _dbx: Dropbox = new Dropbox({
    clientId: DROPBOX_APP_KEY,
  });


  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
    private  _httpClient: HttpClient,
  ) {
    this._accessToken$.subscribe((accessToken) => {
      console.log('_accessToken$', accessToken);
      if (accessToken) {
        this._dbx.setAccessToken(accessToken);
      }
    });
  }

  async getMeta() {
  }

  async get({path, localRev, options}: { path: string; localRev?: string; options?: any }) {
    await this.isReady$.toPromise();

    // TODO implement
    // if (options && options.ifNoneMatch) {
    //   params.headers['If-None-Match'] = options.ifNoneMatch;
    // }

    return this._request({
      method: 'GET',
      url: 'https://content.dropboxapi.com/2/files/download',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({path}),
      },
    }).then((res) => {
      console.log(res);
      const meta = JSON.parse(res.headers['dropbox-api-result']);
      return {meta, data: res.data};
      // TODO
      // if (status === 409) {
      // }
      // try {
      //   meta = JSON.parse(meta);
      // } catch (e) {
      //   return Promise.reject(e);
      // }
    });
  }


  async upload({path, localRev, data, options}: { path: string; options?: any; localRev?: string, data: any }) {
    await this.isReady$.toPromise();
    const args = {
      mode: {'.tag': 'overwrite'},
      mute: true
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
    }).then((res) => {
      console.log(res);
      return res;
    });
  }


  async _request({url, method = 'GET', data, headers = {}, params = {}}: {
    url: string;
    method?: Method;
    headers?: { [key: string]: any },
    data?: string | object
    params?: { [key: string]: string },
  }): Promise<AxiosResponse> {
    await this.isReady$.toPromise();
    const authToken = await this._accessToken$.pipe(first()).toPromise();

    return axios.request({
      url: params
        ? url + qs.stringify(params)
        : url,
      method,
      data,
      headers: {
        authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...(typeof data === 'object'
          ? {'Content-Type': 'application/json; charset=UTF-8'}
          : {}),
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
    }).then(res => res.data.access_token);
  }
}
