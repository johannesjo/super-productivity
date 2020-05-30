import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {DROPBOX_APP_KEY, DROPBOX_APP_SECRET} from './dropbox.const';
import {GlobalConfigService} from '../config/global-config.service';
import {delay, first, map, switchMap, tap} from 'rxjs/operators';
import {DataInitService} from '../../core/data-init/data-init.service';
import {Observable} from 'rxjs';

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
  ) {
    this._accessToken$.subscribe((accessToken) => {
      console.log('_accessToken$', accessToken);
      if (accessToken) {
        this._dbx.setAccessToken(accessToken);
      }
    });
  }

  async loadFile(args: DropboxTypes.files.DownloadArg): Promise<DropboxTypes.files.FileMetadata> {
    await this.isReady$.toPromise();
    return this._dbx.filesDownload(args);
  }

  async uploadFile(args: DropboxTypes.files.CommitInfo): Promise<DropboxTypes.files.FileMetadata> {
    await this.isReady$.toPromise();
    return this._dbx.filesUpload(args);
  }

  async getUser(): Promise<DropboxTypes.users.FullAccount> {
    await this.isReady$.toPromise();
    return this._dbx.usersGetCurrentAccount();
  }

  // TODO use this as the standard approach for making requests instead of using the bloated api
  async getAccessTokenFromAuthCode(authCode: string): Promise<string> {
    const postData = {
      code: authCode,
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    };

    const formBodyA: string[] = [];
    // tslint:disable-next-line:forin
    for (const property in postData) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(postData[property]);
      formBodyA.push(`${encodedKey}=${encodedValue}`);
    }
    const formBody = formBodyA.join('&');

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: formBody,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText);
    }
    const o = JSON.parse(responseText);
    return o && o.access_token;
  }

  // private async _execRequest(method = 'GET', apiPath: string = '', body = null, headers: any = {}, options: any = {}) {
  //   await this.isReady$.toPromise();
  //   const authToken = this._accessToken$.pipe(first()).toPromise();
  //   if (!options.target) {
  //     options.target = 'string';
  //   }
  //   headers = {
  //     ...headers,
  //     Authorization: `Bearer ${authToken}`
  //   };
  //
  //   const endPointFormat = ['files/upload', 'files/download'].indexOf(apiPath) >= 0
  //     ? 'content'
  //     : 'api';
  //
  //   if (endPointFormat === 'api') {
  //     headers['Content-Type'] = 'application/json';
  //     if (body && typeof body === 'object') {
  //       body = JSON.stringify(body);
  //     }
  //   } else {
  //     headers['Content-Type'] = 'application/octet-stream';
  //   }
  //
  //   const fetchOptions: RequestInit = {
  //     headers,
  //     method,
  //   };
  //
  //   if (options.path) {
  //     (fetchOptions as any).path = options.path;
  //   }
  //   if (body) {
  //     fetchOptions.body = body;
  //   }
  //
  //   const url = apiPath.indexOf('https://') === 0
  //     ? apiPath
  //     : `${this.baseUrl(endPointFormat)}/${apiPath}`;
  //
  //   let response = null;
  //   // if (options.source === 'file' && (method === 'POST' || method === 'PUT')) {
  //   //   response = await uploadBlob(url, fetchOptions);
  //   // } else if (options.target === 'string') {
  //   response = await fetch(url, fetchOptions);
  //   // } else {
  //   // file
  //   // response = await fetchBlob(url, fetchOptions);
  //   // }
  //
  //   const responseText = await response.text();
  //
  //   // console.info('Response: ' + responseText);
  //
  //   let responseJson = null;
  //   const loadResponseJson = () => {
  //     if (!responseText) {
  //       return null;
  //     }
  //     if (responseJson) {
  //       return responseJson;
  //     }
  //     try {
  //       responseJson = JSON.parse(responseText);
  //     } catch (error) {
  //       return {error: responseText};
  //     }
  //     return responseJson;
  //   };
  //   // Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
  //
  //   return loadResponseJson();
  // }
  //
  // private baseUrl(endPointFormat: 'content' | 'api') {
  //   if (['content', 'api'].indexOf(endPointFormat) < 0) {
  //     throw new Error(`Invalid end point format: ${endPointFormat}`);
  //   }
  //   return `https://${endPointFormat}.dropboxapi.com/2`;
  // }
}
