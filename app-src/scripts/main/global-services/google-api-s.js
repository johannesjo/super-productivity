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

  const DEFAULT_FIELDS_FOR_DRIVE = 'id,title,mimeType,userPermission,editable,copyable,shared,fileSize';

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
    constructor(GOOGLE, $q, IS_ELECTRON, $http, $rootScope, SimpleToast, $log) {
      this.$q = $q;
      this.$http = $http;
      this.$log = $log;
      this.$rootScope = $rootScope;
      this.GOOGLE = GOOGLE;
      this.IS_ELECTRON = IS_ELECTRON;
      this.SimpleToast = SimpleToast;
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
      const isExpired = (window.moment()
        .valueOf() + EXPIRES_SAFETY_MARGIN > this.$rootScope.r.googleTokens.expiresAt);

      if (this.$rootScope.r.googleTokens.accessToken && !isExpired) {
        this.accessToken = this.$rootScope.r.googleTokens.accessToken;
        this.isLoggedIn = true;
        return new Promise((resolve) => resolve());
      }

      if (this.IS_ELECTRON) {
        window.ipcRenderer.send('TRIGGER_GOOGLE_AUTH');
        return new Promise((resolve, reject) => {
          window.ipcRenderer.on('GOOGLE_AUTH_TOKEN', (ev, data) => {
            const token = data.access_token;
            this.accessToken = token;
            this.$rootScope.r.googleTokens.accessToken = this.accessToken;
            //this.$rootScope.r.googleTokens.refreshToken = data.refresh_token;
            this.isLoggedIn = true;
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
            } else {
              return window.gapi.auth2.getAuthInstance().signIn()
                .then((res) => {
                  console.log(res);
                  this.isLoggedIn = true;
                  this.saveToken(res);
                });
            }
          });
      }
      /*jshint camelcase: true */
    }

    saveToken(res) {
      /*jshint camelcase: false */
      this.accessToken = res.Zi.access_token;
      this.$rootScope.r.googleTokens.accessToken = this.accessToken;
      this.$rootScope.r.googleTokens.expiresAt = res.Zi.expires_at;
      /*jshint camelcase: true */
    }

    logout() {
      this.isLoggedIn = false;

      if (this.IS_ELECTRON) {
        this.accessToken = undefined;
        this.$rootScope.r.googleTokens.accessToken = undefined;
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
      this.SimpleToast('ERROR', 'GoogleApi Error' + errStr);
      return this.$q.reject();
    }

    // Other interaction
    //-------------------
    appendRow(spreadsheetId, row) {
      // @see: https://developers.google.com/sheets/api/reference/rest/
      const range = 'A1:Z99';
      return this.$http({
        method: 'POST',
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`,
        params: {
          'key': this.GOOGLE.API_KEY,
          insertDataOption: 'INSERT_ROWS',
          valueInputOption: 'USER_ENTERED'
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        data: { values: [row] }
      }).catch(this.handleError.bind(this));
    }

    getSpreadsheetData(spreadsheetId, range) {
      // @see: https://developers.google.com/sheets/api/reference/rest/
      return this.$http({
        method: 'GET',
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        params: {
          'key': this.GOOGLE.API_KEY,
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }).catch(this.handleError.bind(this));
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
        }).catch(this.handleError.bind(this));

      return defer.promise;
    }

    loadFile(fileId) {
      if (!fileId) {
        this.SimpleToast('ERROR', 'GoogleApi: No file id specified');
        return this.$q.reject('No file id given');
      }

      const metaData = this.$http({
        method: 'GET',
        url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          supportsTeamDrives: true,
          fields: DEFAULT_FIELDS_FOR_DRIVE
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const fileData = this.$http({
        method: 'GET',
        url: `https://content.googleapis.com/drive/v2/files/${encodeURIComponent(fileId)}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          supportsTeamDrives: true,
          alt: 'media'
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return this.$q.all([this.$q.when(metaData), this.$q.when(fileData)])
        .then((res) => {
          return this.$q.when({
            backup: res[1].data,
            meta: res[0].data,
          });
        }).catch(this.handleError.bind(this));
    }

    saveFile(content, metadata = {}) {
      //window.gapi.client.setApiKey(this.GOOGLE.API_KEY);

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

      return this.$http({
        method: method,
        url: `https://content.googleapis.com${path}`,
        params: {
          'key': this.GOOGLE.API_KEY,
          uploadType: 'multipart',
          supportsTeamDrives: true,
          fields: DEFAULT_FIELDS_FOR_DRIVE
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': multipart.type
        },
        data: multipart.body
      }).catch(this.handleError.bind(this));
    }
  }

  angular
    .module('superProductivity')
    .service('GoogleApi', GoogleApi);

  // hacky fix for ff
  GoogleApi.$$ngIsClass = true;
})();

