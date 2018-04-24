/**
 * @ngdoc service
 * @name superProductivity.GoogleApi
 * @description
 * # GoogleApi
 * Service in the superProductivity.
 */
(() => {
  'use strict';

  const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
  const SCOPES = '' +
    'https://www.googleapis.com/auth/spreadsheets.readonly' +
    ' https://www.googleapis.com/auth/drive.install' +
    ' https://www.googleapis.com/auth/drive';

  const DEFAULT_FIELDS_FOR_DRIVE = 'id,title,mimeType,userPermission,editable,modifiedDate,shared,createdDate,fileSize';

  /**
   * Helper for building multipart requests for uploading to Drive.
   */
  const MultiPartBuilder = function() {
    this.boundary = Math.random().toString(36).slice(2);
    this.mimeType = 'multipart/mixed; boundary="' + this.boundary + '"';
    this.parts = [];
    this.body = null;
  };

  /**
   * Appends a part.
   *
   * @param {String} mimeType Content type of this part
   * @param {Blob|File|String} content Body of this part
   */
  MultiPartBuilder.prototype.append = function(mimeType, content) {
    if (this.body !== null) {
      throw new Error('Builder has already been finalized.');
    }
    this.parts.push(
      '\r\n--', this.boundary, '\r\n',
      'Content-Type: ', mimeType, '\r\n\r\n',
      content);
    return this;
  };

  /**
   * Finalizes building of the multipart request and returns a Blob containing
   * the request. Once finalized, appending additional parts will result in an
   * error.
   *
   * @returns {Object} Object containing the mime type (mimeType) & assembled multipart body (body)
   */
  MultiPartBuilder.prototype.finish = function() {
    if (this.parts.length === 0) {
      throw new Error('No parts have been added.');
    }
    if (this.body === null) {
      this.parts.push('\r\n--', this.boundary, '--');
      this.body = this.parts.join('');
      // TODO - switch to blob once gapi.client.request allows it
      // this.body = new Blob(this.parts, {type: this.mimeType});
    }
    return {
      type: this.mimeType,
      body: this.body
    };
  };

  class GoogleApi {
    /* @ngInject */
    constructor(GOOGLE, $q, IS_ELECTRON, $http, $rootScope, $mdToast, SimpleToast, $log) {
      this.$q = $q;
      this.$http = $http;
      this.$log = $log;
      this.$rootScope = $rootScope;
      this.GOOGLE = GOOGLE;
      this.IS_ELECTRON = IS_ELECTRON;
      this.SimpleToast = SimpleToast;
      this.$mdToast = $mdToast;
      this.data = this.$rootScope.r.googleTokens;
      this.isLoggedIn = false;
    }

    initClientLibraryIfNotDone() {
      const defer = this.$q.defer();
      this.loadLib(() => {
        window.gapi.load('client:auth2', () => {
          this.initClient()
            .then(() => {
              const GoogleAuth = window.gapi.auth2.getAuthInstance();
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

      this.isScriptLoaded = false;
      const loadFunction = () => {
        if (that.isScriptLoaded) {
          return;
        }
        that.isScriptLoaded = true;
        if (cb) {
          cb();
        }
      };
      script.onload = loadFunction.bind(that);
      script.onreadystatechange = loadFunction.bind(that);
      document.getElementsByTagName('head')[0].appendChild(script);
    }

    loadLib(cb) {
      this.loadJs('https://apis.google.com/js/api.js', cb);
    }

    initClient() {
      return window.gapi.client.init({
        apiKey: this.GOOGLE.API_KEY,
        clientId: this.GOOGLE.CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      });

    }

    login() {
      /*jshint camelcase: false */
      const EXPIRES_SAFETY_MARGIN = 30000;
      const isExpired = (!this.data.expiresAt || window.moment()
        .valueOf() + EXPIRES_SAFETY_MARGIN > this.data.expiresAt);

      if (isExpired) {
        this.data.accessToken = undefined;
      }

      if (this.data.accessToken && !isExpired) {
        this.isLoggedIn = true;
        return new Promise((resolve) => resolve());
      }

      if (this.IS_ELECTRON) {
        window.ipcRenderer.send('TRIGGER_GOOGLE_AUTH');
        return new Promise((resolve, reject) => {
          window.ipcRenderer.on('GOOGLE_AUTH_TOKEN', (ev, data) => {
            const token = data.access_token;
            this.data.accessToken = token;
            this.data.expiresAt = (data.expires_in * 1000) + window.moment().valueOf();

            //this.data.refreshToken = data.refresh_token;
            this.isLoggedIn = true;
            this.SimpleToast('SUCCESS', 'GoogleApi: Login successful');

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
              this.isLoggedIn = true;
              this.saveToken(user);
              this.SimpleToast('SUCCESS', 'GoogleApi: Login successful');
            } else {
              return window.gapi.auth2.getAuthInstance().signIn()
                .then((res) => {
                  console.log(res);
                  this.isLoggedIn = true;
                  this.saveToken(res);
                  this.SimpleToast('SUCCESS', 'GoogleApi: Login successful');
                });
            }
          });
      }
      /*jshint camelcase: true */
    }

    saveToken(res) {
      /*jshint camelcase: false */
      this.data.accessToken = res.Zi.access_token;
      this.data.expiresAt = res.Zi.expires_at;
      /*jshint camelcase: true */
    }

    logout() {
      this.isLoggedIn = false;
      this.data.accessToken = undefined;
      this.data.expiresAt = undefined;
      this.data.refreshToken = undefined;

      if (this.IS_ELECTRON) {
        return new Promise((resolve) => {
          resolve();
        });
      } else {
        if (window.gapi) {
          return window.gapi.auth2.getAuthInstance().signOut();
        } else {
          return new Promise((resolve) => {
            resolve();
          });
        }
      }
    }

    // Other interaction
    //-------------------
    appendRow(spreadsheetId, row) {
      // @see: https://developers.google.com/sheets/api/reference/rest/
      const range = 'A1:Z99';
      return this.requestWrapper(this.$http({
        method: 'POST',
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
        params: {
          'key': this.GOOGLE.API_KEY,
          insertDataOption: 'INSERT_ROWS',
          valueInputOption: 'USER_ENTERED'
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`
        },
        data: { values: [row] }
      }));
    }

    getSpreadsheetData(spreadsheetId, range) {
      // @see: https://developers.google.com/sheets/api/reference/rest/
      return this.requestWrapper(this.$http({
        method: 'GET',
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        params: {
          'key': this.GOOGLE.API_KEY,
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`
        }
      }));
    }

    getSpreadsheetHeadingsAndLastRow(spreadsheetId) {
      const defer = this.$q.defer();

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
        this.SimpleToast('ERROR', 'GoogleApi: No file id specified');
        return this.$q.reject('No file id given');
      }

      return this.requestWrapper(this.$http({
        method: 'GET',
        url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          supportsTeamDrives: true,
          fields: DEFAULT_FIELDS_FOR_DRIVE
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`,
        },
      }));
    }

    findFile(fileName) {
      if (!fileName) {
        this.SimpleToast('ERROR', 'GoogleApi: No file name specified');
        return this.$q.reject('No file name given');
      }

      return this.requestWrapper(this.$http({
        method: 'GET',
        url: `https://content.googleapis.com/drive/v2/files`,
        params: {
          'key': this.GOOGLE.API_KEY,
          // should be called name officially instead of title
          q: `title='${fileName}' and trashed=false`,
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`,
        },
      }));
    }

    loadFile(fileId) {
      if (!fileId) {
        this.SimpleToast('ERROR', 'GoogleApi: No file id specified');
        return this.$q.reject('No file id given');
      }

      const metaData = this.getFileInfo(fileId);
      const fileContents = this.requestWrapper(this.$http({
        method: 'GET',
        url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          supportsTeamDrives: true,
          alt: 'media'
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`,
        },
      }));

      return this.$q.all([this.$q.when(metaData), this.$q.when(fileContents)])
        .then((res) => {
          return this.$q.when({
            backup: res[1].data,
            meta: res[0].data,
          });
        });
    }

    saveFile(content, metadata = {}) {
      if (!angular.isString(content)) {
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

      return this.requestWrapper(this.$http({
        method: method,
        url: `https://content.googleapis.com${path}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          uploadType: 'multipart',
          supportsTeamDrives: true,
          fields: DEFAULT_FIELDS_FOR_DRIVE
        },
        headers: {
          'Authorization': `Bearer ${this.data.accessToken}`,
          'Content-Type': multipart.type
        },
        data: multipart.body
      }));
    }

    handleUnAuthenticated(err) {
      this.$log.error(err);
      this.logout();

      const icon = 'error';
      const iconColor = '#e15d63';
      const msg = 'GoogleApi: Failed to authenticate please try logging in again!';
      this.$mdToast.show({
        hideDelay: 20 * 1000,
        /* @ngInject */
        controller: ($scope, $mdToast, GoogleApi) => {
          $scope.login = () => {
            GoogleApi.login();
            $mdToast.hide();
          };
        },
        template: `
<md-toast>
  <div class="md-toast-content">
    <div class="icon-wrapper">
      <ng-md-icon icon="${icon}" style="fill:${iconColor}"></ng-md-icon>
    </div>
    <div class="toast-text">${msg}</div> 
    <md-button ng-click="login()">Login</md-button>
  </div>
</md-toast>`
      });
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

      this.$log.error(err);

      if (err && err.status === 401) {
        this.handleUnAuthenticated(err);
      } else {
        this.$log.error(err);
        this.SimpleToast('ERROR', 'GoogleApi Error' + errStr);
      }

      return this.$q.reject();
    }

    requestWrapper(request) {
      const defer = this.$q.defer();
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
  }

  angular
    .module('superProductivity')
    .service('GoogleApi', GoogleApi);

  // hacky fix for ff
  GoogleApi.$$ngIsClass = true;
})();

