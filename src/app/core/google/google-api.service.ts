import { Injectable } from '@angular/core';
import { GOOGLE_DEFAULT_FIELDS_FOR_DRIVE, GOOGLE_DISCOVERY_DOCS, GOOGLE_SCOPES, GOOGLE_SETTINGS } from './google.const';
import * as moment from 'moment';
import { IS_ELECTRON } from '../../app.constants';
import { MultiPartBuilder } from './util/multi-part-builder';
import { HttpClient } from '@angular/common/http';
import { toPromise } from 'rxjs/operator/toPromise';

const gapi: any = window['gapi'];
const mapQDefer = () => {
  const defer = {
    reject: undefined,
    resolve: undefined,
    promise: undefined,
  };
  defer.promise = new Promise((reject, resolve) => {
    defer.reject = reject;
    defer.resolve = resolve;
  });
  return defer;
};

@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  private _isScriptLoaded = false;
  private _isLoggedIn = false;
  // TODO saved tokens
  private _data = {
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
  };

  constructor(private readonly _http: HttpClient) {
  }


  initClientLibraryIfNotDone() {
    const defer = mapQDefer();
    this.loadLib(() => {
      gapi.load('client:auth2', () => {
        this.initClient()
          .then(() => {
            const GoogleAuth = gapi.auth2.getAuthInstance();
            // used to determine and handle if user is already signed in
            const user = GoogleAuth.currentUser.get();
            defer.resolve(user);
          });
      });
    });

    return defer.promise;
  }

  loadJs(url, cb) {
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
    script['onreadystatechange'] = loadFunction.bind(that);
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  loadLib(cb) {
    this.loadJs('https://apis.google.com/js/api.js', cb);
  }

  initClient() {
    return gapi.client.init({
      apiKey: GOOGLE_SETTINGS.API_KEY,
      clientId: GOOGLE_SETTINGS.CLIENT_ID,
      discoveryDocs: GOOGLE_DISCOVERY_DOCS,
      scope: GOOGLE_SCOPES
    });

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
      this._isLoggedIn = true;
      return new Promise((resolve) => resolve());
    }

    if (IS_ELECTRON) {
      window.ipcRenderer.send('TRIGGER_GOOGLE_AUTH', this._data.refreshToken);
      return new Promise((resolve, reject) => {
        window.ipcRenderer.on('GOOGLE_AUTH_TOKEN', (ev, data) => {
          this._data.accessToken = data.access_token;
          this._data.expiresAt = (data.expires_in * 1000) + moment().valueOf();
          this._data.refreshToken = data.refresh_token;
          this._isLoggedIn = true;
          this._snackIt('SUCCESS', 'GoogleApi: Login successful');

          resolve();
          // TODO remove
          // mainWindow.webContents.removeListener('did-finish-load', handler);
        });
        window.ipcRenderer.on('GOOGLE_AUTH_TOKEN_ERROR', reject);
      });
    } else {
      return this.initClientLibraryIfNotDone()
        .then((user) => {
          if (user && user.Zi && user.Zi.access_token) {
            this._isLoggedIn = true;
            this.saveToken(user);
            this._snackIt('SUCCESS', 'GoogleApi: Login successful');
          } else {
            return gapi.auth2.getAuthInstance().signIn()
              .then((res) => {
                console.log(res);
                this._isLoggedIn = true;
                this.saveToken(res);
                this._snackIt('SUCCESS', 'GoogleApi: Login successful');
              });
          }
        });
    }
    /*jshint camelcase: true */
  }

  saveToken(res) {
    /*jshint camelcase: false */
    this._data.accessToken = res.Zi.access_token;
    this._data.expiresAt = res.Zi.expires_at;
    /*jshint camelcase: true */
  }

  logout() {
    this._isLoggedIn = false;
    this._data.accessToken = undefined;
    this._data.expiresAt = undefined;
    this._data.refreshToken = undefined;

    if (IS_ELECTRON) {
      return new Promise((resolve) => {
        resolve();
      });
    } else {
      if (gapi) {
        return gapi.auth2.getAuthInstance().signOut();
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
    return this.requestWrapper(this._mapHttp({
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
    return this.requestWrapper(this._mapHttp({
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
    const defer = mapQDefer();

    this.getSpreadsheetData(spreadsheetId, 'A1:Z99')
      .then((response) => {
        const range = response.result || response.data;

        if (range.values && range.values[0]) {
          defer.resolve({
            headings: range.values[0],
            lastRow: range.values[range.values.length - 1],
          });
        } else {
          defer.reject('No data found');
          this.handleError('No data found');
        }
      });

    return this.requestWrapper(defer.promise);
  }

  getFileInfo(fileId) {
    if (!fileId) {
      this._snackIt('ERROR', 'GoogleApi: No file id specified');
      return Promise.reject('No file id given');
    }

    return this.requestWrapper(this._mapHttp({
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

    return this.requestWrapper(this._mapHttp({
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
    const fileContents = this.requestWrapper(this._mapHttp({
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

    return this.requestWrapper(this._mapHttp({
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

  handleUnAuthenticated(err) {
    console.error(err);
    this.logout();

    const icon = 'error';
    const iconColor = '#e15d63';
    const msg = 'GoogleApi: Failed to authenticate please try logging in again!';
    // TODO implement this
//     this.$mdToast.show({
//       hideDelay: 20 * 1000,
//       /* @ngInject */
//       controller: ($scope, $mdToast, GoogleApi) => {
//         $scope.login = () => {
//           GoogleApi.login();
//           $mdToast.hide();
//         };
//       },
//       template: `
// <md-toast>
//   <div class="md-toast-content">
//     <div class="icon-wrapper">
//       <ng-md-icon icon="${icon}" style="fill:${iconColor}"></ng-md-icon>
//     </div>
//     <div class="toast-text">${msg}</div>
//     <md-button ng-click="login()">Login</md-button>
//   </div>
// </md-toast>`
//     });
  }

  handleError(err) {
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
      this.handleUnAuthenticated(err);
    } else {
      console.error(err);
      this._snackIt('ERROR', 'GoogleApi Error' + errStr);
    }
  }

  requestWrapper(request) {
    const defer = mapQDefer();
    request.then((res) => {
      if (res && res.status < 300) {
        defer.resolve(res);
      } else if (!res) {
        this.handleError('No response body');
        defer.reject(res);
      } else if (res && res.status >= 300) {
        this.handleError(res);
      } else if (res && res.status === 401) {
        this.handleUnAuthenticated(res);
        defer.reject(res);
      } else {
        // in dubio pro reo
        defer.resolve(res);
      }

    }).catch((err) => {
      this.handleError(err);
      defer.reject(err);
    });
    return defer.promise;
  }

  private _snackIt(snackType, msg) {
    console.log('SNACK', arguments);
  }

  private _mapHttp(params: any): Promise<any> {
    return this._http.request(params).toPromise();
  }
}
