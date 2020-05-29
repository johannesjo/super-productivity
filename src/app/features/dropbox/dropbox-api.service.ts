import {Injectable} from '@angular/core';

import {Dropbox} from 'dropbox';
import {ReplaySubject} from 'rxjs';
import {DROPBOX_APP_KEY} from './dropbox.const';
import {LS_DROPBOX_ACCESS_TOKEN} from '../../core/persistence/ls-keys.const';

@Injectable({
  providedIn: 'root'
})
export class DropboxApiService {
  accessToken = this._getAccessToken();
  dbx: Dropbox = new Dropbox({
    clientId: DROPBOX_APP_KEY,
    accessToken: this.accessToken
  });
  // isLoggedIn$ = new BehaviorSubject(!!this.accessToken);
  isLoggedIn$ = new ReplaySubject();

  constructor() {
    // this._clearToken();
    console.log(this.dbx);
    this.dbx.usersGetCurrentAccount().then((response) => {
      console.log(response);
      this.isLoggedIn$.next(true);
    }).catch(() => {
      this.signOut();
    });
    // this.dbx.filesListFolder({path: ''}).then((response) => {
    //   console.log(response);
    // });
    this.signIn();
  }

  signIn() {
    if (!this.accessToken && confirm('Login')) {
      const authUrl = this.dbx.getAuthenticationUrl(window.location.origin);
      console.log('authUrl', authUrl);
      window.location.href = authUrl;
    }
    // TODO electron & android
  }

  signOut() {
    this._clearToken();
  }

  private _getAccessToken(): string {
    const qst = this._getAccessTokenFromQueryString();
    if (qst) {
      this._saveAccessToken(qst);
      return qst;
    }
    return this._getAccessTokenFromLocalStorage();
  }

  private _getAccessTokenFromQueryString(): string {
    const hm = this._getParsedHash();
    console.log(hm);
    return hm && hm.access_token;
  }

  private _getParsedHash(): { [key: string]: string } {
    const hash = window.location.hash.substring(1);
    const params = {};
    hash.split('&').map(hk => {
      const temp = hk.split('=');
      params[temp[0]] = temp[1];
    });
    return params;
  }

  private _getAccessTokenFromLocalStorage(): string {
    return localStorage.getItem(LS_DROPBOX_ACCESS_TOKEN);
  }

  private _saveAccessToken(token: string) {
    localStorage.setItem(LS_DROPBOX_ACCESS_TOKEN, token);
  }

  private _clearToken() {
    localStorage.removeItem(LS_DROPBOX_ACCESS_TOKEN);
    this.accessToken = undefined;
    this.isLoggedIn$.next(false);
  }


  private _downloadFile() {

  }

  private _uploadFile() {
  }
}
