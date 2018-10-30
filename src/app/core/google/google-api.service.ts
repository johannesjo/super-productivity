import { Injectable } from '@angular/core';
import { GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS } from './google.const';
import * as moment from 'moment';
import { IS_ELECTRON } from '../../app.constants';
import { MultiPartBuilder } from './util/multi-part-builder';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { SnackService } from '../snack/snack.service';
import { SnackType } from '../snack/snack.model';


@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  public isLoggedIn = false;
  private _isScriptLoaded = false;
  // TODO save and load tokens
  private _data = {
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
  };
  private _gapi: any;

  constructor(private readonly _http: HttpClient,
              private readonly _snackService: SnackService) {
  }


  login() {
    /*jshint camelcase: false */
    const EXPIRES_SAFETY_MARGIN = 30000;
    const isExpired = (!this._data.expiresAt || moment()
      .valueOf() + EXPIRES_SAFETY_MARGIN > this._data.expiresAt);

    if (isExpired) {
      this._data.accessToken = undefined;
    }

    if (this._data.accessToken && !isExpired) {
      this.isLoggedIn = true;
      return new Promise((resolve) => resolve());
    }

    if (IS_ELECTRON) {
      window.ipcRenderer.send('TRIGGER_GOOGLE_AUTH', this._data.refreshToken);
      return new Promise((resolve, reject) => {
        window.ipcRenderer.on('GOOGLE_AUTH_TOKEN', (ev, data) => {
          this._data.accessToken = data.access_token;
          this._data.expiresAt = (data.expires_in * 1000) + moment().valueOf();
          this._data.refreshToken = data.refresh_token;
          this.isLoggedIn = true;
          this._snackIt('SUCCESS', 'GoogleApi: Login successful');

          resolve();
          // TODO remove
          // mainWindow.webContents.removeListener('did-finish-load', handler);
        });
        window.ipcRenderer.on('GOOGLE_AUTH_TOKEN_ERROR', reject);
      });
    } else {
      return this._initClientLibraryIfNotDone()
        .then((user: any) => {
          if (user && user.Zi && user.Zi.access_token) {
            this.isLoggedIn = true;
            this._saveToken(user);
            this._snackIt('SUCCESS', 'GoogleApi: Login successful');
          } else {
            return this._gapi.auth2.getAuthInstance().signIn()
              .then((res) => {
                this.isLoggedIn = true;
                this._saveToken(res);
                this._snackIt('SUCCESS', 'GoogleApi: Login successful');
              });
          }
        });
    }
    /*jshint camelcase: true */
  }


  logout() {
    this.isLoggedIn = false;
    this._data.accessToken = undefined;
    this._data.expiresAt = undefined;
    this._data.refreshToken = undefined;

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
    return this._requestWrapper(this._mapHttp({
      method: 'POST',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'USER_ENTERED'
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`
      },
      data: {values: [row]}
    }));
  }

  getSpreadsheetData(spreadsheetId, range) {
    // @see: https://developers.google.com/sheets/api/reference/rest/
    return this._requestWrapper(this._mapHttp({
      method: 'GET',
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`
      }
    }));
  }

  getSpreadsheetHeadingsAndLastRow(spreadsheetId) {
    return this._requestWrapper(new Promise((resolve, reject) => {
      this.getSpreadsheetData(spreadsheetId, 'A1:Z99')
        .then((response: any) => {
          const range = response.result || response.data || response;

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
    }));
  }

  getFileInfo(fileId) {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    return this._requestWrapper(this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`,
      },
    }));
  }

  findFile(fileName) {
    if (!fileName) {
      this._snackIt('ERROR', 'GoogleApi: No file name specified');
      return Promise.reject('No file name given');
    }

    return this._requestWrapper(this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        // should be called name officially instead of title
        q: `title='${fileName}' and trashed=false`,
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`,
      },
    }));
  }

  loadFile(fileId) {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    const metaData = this.getFileInfo(fileId);
    const fileContents = this._requestWrapper(this._mapHttp({
      method: 'GET',
      url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        supportsTeamDrives: true,
        alt: 'media'
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`,
      },
    }));

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

    return this._requestWrapper(this._mapHttp({
      method: method,
      url: `https://content.googleapis.com${path}`,
      params: {
        'key': GOOGLE_SETTINGS.API_KEY,
        uploadType: 'multipart',
        supportsTeamDrives: true,
        fields: GOOGLE_DEFAULT_FIELDS_FOR_DRIVE
      },
      headers: {
        'Authorization': `Bearer ${this._data.accessToken}`,
        'Content-Type': multipart.type
      },
      data: multipart.body
    }));
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
    /*jshint camelcase: false */
    this._data.accessToken = res.Zi.access_token;
    this._data.expiresAt = res.Zi.expires_at;
    /*jshint camelcase: true */
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
    } else if (err && err.data && err.data.error) {
      errStr = err.data.error.message;
    }

    if (errStr) {
      errStr = ': ' + errStr;
    }

    console.error(err);

    if (err && err.status === 401) {
      this._handleUnAuthenticated(err);
    } else {
      console.error(err);
      this._snackIt('ERROR', 'GoogleApi Error' + errStr);
    }
  }

  private _requestWrapper(request) {
    return new Promise((resolve, reject) => {
      request.then((res) => {
        // this._handleUnAuthenticated(res);
        // reject(res);
        // return;

        if (res && res.status < 300) {
          resolve(res);
        } else if (!res) {
          this._handleError('No response body');
          reject(res);
        } else if (res && res.status >= 300) {
          this._handleError(res);
        } else if (res && res.status === 401) {
          this._handleUnAuthenticated(res);
          reject(res);
        } else {
          // in dubio pro reo
          resolve(res);
        }

      }).catch((err) => {
        this._handleError(err);
        reject(err);
      });
    });
  }

  private _snackIt(snackType: SnackType, msg: string) {
    console.log('SNACK', arguments);
    this._snackService.open({
      message: msg,
      type: snackType,
    });
  }

  private _mapHttp(p: HttpRequest | any): Promise<any> {
    return this._http[p.method.toLowerCase()](p.url, p).toPromise();
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
