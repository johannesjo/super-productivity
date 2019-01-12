import { Injectable } from '@angular/core';
import { GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS } from './google.const';
import * as moment from 'moment';
import { IS_ELECTRON } from '../../app.constants';
import { MultiPartBuilder } from './util/multi-part-builder';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { SnackService } from '../snack/snack.service';
import { SnackType } from '../snack/snack.model';
import { ConfigService } from '../../config/config.service';
import { GlobalConfig, GoogleSession } from '../../config/config.model';
import { catchError, map } from 'rxjs/operators';
import { EmptyObservable } from 'rxjs-compat/observable/EmptyObservable';
import { Observable } from 'rxjs';
import { IPC_GOOGLE_AUTH_TOKEN, IPC_GOOGLE_AUTH_TOKEN_ERROR, IPC_TRIGGER_GOOGLE_AUTH } from '../../../ipc-events.const';
import { ElectronService } from 'ngx-electron';

const EXPIRES_SAFETY_MARGIN = 30000;

@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  public isLoggedIn: boolean;
  public isLoggedIn$: Observable<boolean> = this._configService.cfg$
    .pipe(map((cfg: GlobalConfig) => {
      const session = cfg && cfg._googleSession;
      const isExpired = (!session.expiresAt || moment()
        .valueOf() + EXPIRES_SAFETY_MARGIN > session.expiresAt);
      // console.log('isLoggedIn check', (session && session.accessToken && !isExpired), isExpired, session);
      return session && session.accessToken && !isExpired;
    }));

  private _isScriptLoaded = false;
  private _isGapiInitialized = false;
  private _gapi: any;
  private _refreshLoginTimeout: number;

  constructor(private readonly _http: HttpClient,
              private readonly _configService: ConfigService,
              private readonly _electronService: ElectronService,
              private readonly _snackService: SnackService) {
    this.isLoggedIn$.subscribe((isLoggedIn) => this.isLoggedIn = isLoggedIn);
  }

  private get _session(): GoogleSession {
    return this._configService.cfg && this._configService.cfg._googleSession;
  }

  login() {
    console.log('GOOGLE_LOGIN', this._session);

    if (IS_ELECTRON) {
      if (this.isLoggedIn) {
        return new Promise((resolve) => resolve());
      }

      this._electronService.ipcRenderer.send(IPC_TRIGGER_GOOGLE_AUTH, this._session.refreshToken);
      return new Promise((resolve, reject) => {
        this._electronService.ipcRenderer.on(IPC_GOOGLE_AUTH_TOKEN, (ev, data: any) => {
          console.log('ELECTRON GOOGLE LOGIN RESPONSE', data);
          this._updateSession({
            accessToken: data.access_token,
            expiresAt: data.expiry_date,
            refreshToken: data.refresh_token,
          });
          this._snackIt('SUCCESS', 'GoogleApi: Login successful');

          resolve();
          // TODO remove
          // mainWindow.webContents.removeListener('did-finish-load', handler);
        });
        this._electronService.ipcRenderer.on(IPC_GOOGLE_AUTH_TOKEN_ERROR, reject);
      });
    } else {
      return this._initClientLibraryIfNotDone()
        .then((user: any) => {
          // TODO implement offline access
          // const authInstance = this._gapi.auth2.getAuthInstance();
          // authInstance.grantOfflineAccess()
          //   .then((res) => {
          //     this._updateSession({
          //       refreshToken: res.code
          //     });
          //   });
          const successHandler = (res) => {
            this._saveToken(res);
            this._snackIt('SUCCESS', 'GoogleApi: Login successful');
          };

          if (user && user.Zi && user.Zi.access_token) {
            successHandler(user);
          } else {
            return this._gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse().then(successHandler.bind(this))
              .catch(() => {
                return this._gapi.auth2.getAuthInstance().signIn()
                  .then(successHandler.bind(this));
              });
          }
        });
    }
  }

  // Other interaction

  logout() {
    this._updateSession({
      accessToken: null,
      expiresAt: null,
      refreshToken: null,
    });

    if (IS_ELECTRON) {
      return new Promise((resolve) => {
        resolve();
      });
    } else {
      if (this._gapi) {
        return this._gapi.auth2.getAuthInstance().signOut();
      } else {
        return new Promise((resolve) => {
          resolve();
        });
      }
    }
  }

  // -----------------
  appendRow(spreadsheetId, row) {
    // @see: https://developers.google.com/sheets/api/reference/rest/
    const range = 'A1:Z99';
    return this._mapHttp({
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'USER_ENTERED'
      },
      data: {values: [row]}
    });
  }

  getSpreadsheetData(spreadsheetId, range) {
    // @see: https://developers.google.com/sheets/api/reference/rest/
    return this._mapHttp({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
      },
    });
  }

  getSpreadsheetHeadingsAndLastRow(spreadsheetId) {
    return new Promise((resolve, reject) => {
      this.getSpreadsheetData(spreadsheetId, 'A1:Z99')
        .then((response: any) => {
          console.log(response);

          const range = response.body || response;

          if (range && range.values && range.values[0]) {
            resolve({
              headings: range.values[0],
              lastRow: range.values[range.values.length - 1],
            });
          } else {
            reject('No data found');
            this._handleError('No data found');
          }
        });
    });
  }

  getFileInfo(fileId) {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    return this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
    });
  }

  findFile(fileName) {
    if (!fileName) {
      this._snackIt('ERROR', 'GoogleApi: No file name specified');
      return Promise.reject('No file name given');
    }

    return this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        // should be called name officially instead of title
        q: `title='${fileName}' and trashed=false`,
      },
    });
  }

  loadFile(fileId): Promise<any> {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    const loadFilePromise = this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        alt: 'media'
      },
    });
    const metaDataPromise = this.getFileInfo(fileId);
    return Promise.all([metaDataPromise, loadFilePromise])
      .then((res) => {
        console.log(res);
        return{
          backup: res[1].body,
          meta: res[0].body,
        };
      });
  }

  saveFile(content, metadata: any = {}) {
    if ((typeof content !== 'string')) {
      content = JSON.stringify(content);
    }

    let path;
    let method;

    if (metadata.id) {
      path = '/upload/drive/v2/files/' + encodeURIComponent(metadata.id);
      method = 'PUT';
    } else {
      path = '/upload/drive/v2/files/';
      method = 'POST';
    }

    if (!metadata.mimeType) {
      metadata.mimeType = 'application/json';
    }

    const multipart = new MultiPartBuilder()
      .append('application/json', JSON.stringify(metadata))
      .append(metadata.mimeType, content)
      .finish();

    return this._mapHttp({
      method: method,
      url: `https://content.googleapis.com${path}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        uploadType: 'multipart',
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
      headers: {
        'Content-Type': multipart.type
      },
      data: multipart.body
    });
  }

  private _updateSession(sessionData: Partial<GoogleSession>) {
    console.log('GoogleApi: _updateSession', sessionData);
    if (!sessionData.accessToken) {
      console.warn('GoogleApiService: Logged out willingly???');
    }

    if (!IS_ELECTRON && sessionData.accessToken && sessionData.expiresAt) {
      this._initRefreshTokenTimeoutForWeb(sessionData.expiresAt);
    } else if (this._refreshLoginTimeout) {
      window.clearTimeout(this._refreshLoginTimeout);
    }
    this._configService.updateSection('_googleSession', sessionData, true);
  }

  private _initRefreshTokenTimeoutForWeb(expiresAt: number) {
    if (this._refreshLoginTimeout) {
      window.clearTimeout(this._refreshLoginTimeout);
    }
    this._refreshLoginTimeout = window.setTimeout(() => {
      this._gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse()
        .then((res) => {
          this._saveToken(res);
          console.log(res);
        });
    }, expiresAt - (Date.now() + EXPIRES_SAFETY_MARGIN + 5000));
  }

  private initClient() {
    return this._gapi.client.init({
      apiKey: GOOGLE_SETTINGS.API_KEY,
      clientId: GOOGLE_SETTINGS.CLIENT_ID,
      discoveryDocs: GOOGLE_DISCOVERY_DOCS,
      scope: GOOGLE_SCOPES
    });
  }

  private _initClientLibraryIfNotDone() {
    const getUser = () => {
      const GoogleAuth = this._gapi.auth2.getAuthInstance();
      this._isGapiInitialized = true;
      // used to determine and handle if user is already signed in
      return GoogleAuth.currentUser.get();
    };

    if (this._isGapiInitialized) {
      return Promise.resolve(getUser());
    }

    return new Promise((resolve, reject) => {
      this._loadJs(() => {
        this._gapi = window['gapi'];
        this._gapi.load('client:auth2', () => {
          this.initClient()
            .then(() => {
              resolve(getUser());
            });
        });
      });
    });
  }

  private _saveToken(res) {
    this._updateSession({
      accessToken: res.accessToken || res.access_token || res.Zi.access_token,
      expiresAt: res.expiresAt || res.expires_at || res.Zi.expires_at,
    });
  }

  private _handleUnAuthenticated(err) {
    console.error(err);
    this.logout();
    this._snackIt('GOOGLE_LOGIN', 'GoogleApi: Failed to authenticate please try logging in again!');
  }

  private _handleError(err) {
    let errStr = '';

    if (typeof err === 'string') {
      errStr = err;
    } else if (err && err.error && err.error.error) {
      errStr = err.error.error.message;
    }

    if (errStr) {
      errStr = ': ' + errStr;
    }

    if (err && err.status === 401) {
      this._handleUnAuthenticated(err);
    } else {
      console.warn(err);
      this._snackIt('ERROR', 'GoogleApi Error' + errStr);
    }
  }

  private _snackIt(snackType: SnackType, msg: string) {
    console.log('SNACK', arguments);
    this._snackService.open({
      message: msg,
      type: snackType,
    });
  }

  private _mapHttp(params_: HttpRequest<string> | any): Promise<any> {
    if (!this._session.accessToken) {
      this._handleUnAuthenticated('GoogleApiService: Not logged in');
      return Promise.reject('Not logged in');
    }

    const p = {
      ...params_,
      headers: {
        ...(params_.headers || {}),
        'Authorization': `Bearer ${this._session.accessToken}`,
      }
    };
    const bodyArg = p.data ? [p.data] : [];
    const allArgs = [...bodyArg, {
      headers: new HttpHeaders(p.headers),
      params: new HttpParams({fromObject: p.params}),
    }];
    const req = new HttpRequest(p.method, p.url, ...allArgs);

    // const sub = this._http[p.method.toLowerCase()](p.url, p.data, p)
    const sub = this._http.request(req)
      .pipe(catchError((res) => {
        console.log(res);
        if (!res) {
          this._handleError('No response body');
        } else if (res && res.status >= 300) {
          this._handleError(res);
        } else if (res && res.status === 401) {
          this._handleUnAuthenticated(res);
        }
        return new EmptyObservable<Response>();
      }));
    return sub.toPromise();
  }


  private _loadJs(cb) {
    if (this._isScriptLoaded) {
      cb();
      return;
    }

    const url = 'https://apis.google.com/js/api.js';
    const that = this;
    const script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('type', 'text/javascript');

    this._isScriptLoaded = false;
    const loadFunction = () => {
      if (that._isScriptLoaded) {
        return;
      }
      that._isScriptLoaded = true;
      if (cb) {
        cb();
      }
    };
    script.onload = loadFunction.bind(that);
    // script['onreadystatechange'] = loadFunction.bind(that);
    document.getElementsByTagName('head')[0].appendChild(script);
  }
}
