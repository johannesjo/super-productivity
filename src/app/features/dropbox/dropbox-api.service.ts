import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {DROPBOX_APP_KEY, DROPBOX_APP_SECRET} from './dropbox.const';
import {GlobalConfigService} from '../config/global-config.service';
import {map} from 'rxjs/operators';
import {DataInitService} from '../../core/data-init/data-init.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  public accessCode$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.authCode));

  private _accessToken$: Observable<string> = this._globalConfigService.cfg$.pipe(map(cfg => cfg && cfg.dropboxSync && cfg.dropboxSync.accessToken));

  isLoggedIn$ = this._accessToken$.pipe(
    map((token) => !!token)
  );

  private _dbx: Dropbox = new Dropbox({
    clientId: DROPBOX_APP_KEY,
  });

  private _init$ = this._dataInitService.isAllDataLoadedInitially$;

  constructor(
    private _globalConfigService: GlobalConfigService,
    private _dataInitService: DataInitService,
  ) {
    this._accessToken$.subscribe((v) => console.log('_accessToken$', v));
    this._accessToken$.subscribe((accessToken) => {
      console.log(accessToken);
      if (accessToken) {
        this._dbx.setAccessToken(accessToken);
        console.log(this._dbx);

        this._dbx.usersGetCurrentAccount().then((response) => {
          console.log(response);
        }).catch((e) => {
          console.error(e);
          // warn
        });
      }
    });
  }

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

  async loadFile(args: DropboxTypes.files.DownloadArg): Promise<DropboxTypes.files.FileMetadata> {
    await this._init$.toPromise();
    return this._dbx.filesDownload(args);
  }

  async uploadFile(args: DropboxTypes.files.CommitInfo): Promise<DropboxTypes.files.FileMetadata> {
    await this._init$.toPromise();
    return this._dbx.filesUpload(args);
  }
}
