import { Injectable } from '@angular/core';
import { GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS } from './google.const';
import * as moment from 'moment';
import { IS_ELECTRON } from '../../app.constants';
import { MultiPartBuilder } from './util/multi-part-builder';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { SnackService } from '../snack/snack.service';
import { SnackType } from '../snack/snack.model';
import { ConfigService } from '../config/config.service';
import { GlobalConfig, GoogleSession } from '../config/config.model';
import { catchError, map } from 'rxjs/operators';
import { EmptyObservable } from 'rxjs-compat/observable/EmptyObservable';
import { Observable } from 'rxjs';
import { IPC_EVENT_GOOGLE_AUTH_TOKEN, IPC_EVENT_GOOGLE_AUTH_TOKEN_ERROR, IPC_EVENT_TRIGGER_GOOGLE_AUTH } from '../../../ipc-events.const';


@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  public isLoggedIn: boolean;
  public isLoggedIn$: Observable<boolean> = this._configService.cfg$
    .pipe(map((cfg: GlobalConfig) => {
      const session = cfg && cfg._googleSession;
      const EXPIRES_SAFETY_MARGIN = 30000;
      const isExpired = (!session.expiresAt || moment()
        .valueOf() + EXPIRES_SAFETY_MARGIN > session.expiresAt);
      return session && session.accessToken && !isExpired;
    }));

  private _isScriptLoaded = false;
  private _gapi: any;

  constructor(private readonly _http: HttpClient,
              private readonly _configService: ConfigService,
              private readonly _snackService: SnackService) {
    this.isLoggedIn$.subscribe((isLoggedIn) => this.isLoggedIn = isLoggedIn);
  }

  login() {
    if (this.isLoggedIn) {
      return new Promise((resolve) => resolve());
    }

    if (IS_ELECTRON) {
      window.ipcRenderer.send(IPC_EVENT_TRIGGER_GOOGLE_AUTH, this._session.refreshToken);
      return new Promise((resolve, reject) => {
        window.ipcRenderer.on(IPC_EVENT_GOOGLE_AUTH_TOKEN, (ev, data: any) => {
          this._updateSession({
            accessToken: data.access_token,
            expiresAt: (data.expires_in * 1000) + moment().valueOf(),
            refreshToken: data.refresh_token,
          });
          this._snackIt('SUCCESS', 'GoogleApi: Login successful');

          resolve();
          // TODO remove
          // mainWindow.webContents.removeListener('did-finish-load', handler);
        });
        window.ipcRenderer.on(IPC_EVENT_GOOGLE_AUTH_TOKEN_ERROR, reject);
      });
    } else {
      return this._initClientLibraryIfNotDone()
        .then((user: any) => {
          if (user && user.Zi && user.Zi.access_token) {
            this._saveToken(user);
            this._snackIt('SUCCESS', 'GoogleApi: Login successful');
          } else {
            return this._gapi.auth2.getAuthInstance().signIn()
              .then((res) => {
                this._saveToken(res);
                this._snackIt('SUCCESS', 'GoogleApi: Login successful');
              });
          }
        });
    }
  }


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

  // Other interaction
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

  loadFile(fileId) {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    const metaData = this.getFileInfo(fileId);
    const fileContents = this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        alt: 'media'
      },
    });

    // TODO think of something
    // return this.$q.all([this.$q.when(metaData), this.$q.when(fileContents)])
    //   .then((res) => {
    //     return this.$q.when({
    //       backup: res[1].data,
    //       meta: res[0].data,
    //     });
    //   });
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

  private get _session(): GoogleSession {
    return this._configService.cfg && this._configService.cfg._googleSession;
  }

  private _updateSession(sessionData: Partial<GoogleSession>) {
    console.log('update', sessionData);
    this._configService.updateSection('_googleSession', sessionData);
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
    return new Promise((resolve, reject) => {
      this._loadJs(() => {
        this._gapi = window['gapi'];
        this._gapi.load('client:auth2', () => {
          this.initClient()
            .then(() => {
              const GoogleAuth = this._gapi.auth2.getAuthInstance();
              // used to determine and handle if user is already signed in
              const user = GoogleAuth.currentUser.get();
              resolve(user);
            });
        });
      });
    });
  }

  private _saveToken(res) {
    this._updateSession({
      accessToken: res.accessToken || res.Zi.access_token,
      expiresAt: res.expiresAt || res.Zi.expires_at,
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
    console.log(allArgs);
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
