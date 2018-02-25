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
    ' https://www.googleapis.com/auth/drive';

  class GoogleApi {
    /* @ngInject */
    constructor(GOOGLE, $q, IS_ELECTRON, $http, $rootScope) {
      this.$q = $q;
      this.$http = $http;
      this.$rootScope = $rootScope;
      this.GOOGLE = GOOGLE;
      this.IS_ELECTRON = IS_ELECTRON;
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
              this.saveToken(user);
            } else {
              return window.gapi.auth2.getAuthInstance().signIn()
                .then((res) => {
                  console.log(res);
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
      if (this.IS_ELECTRON) {
        this.accessToken = undefined;
        this.$rootScope.r.googleTokens.accessToken = undefined;
        return new Promise((resolve) => {
          resolve();
        });
      } else {
        return window.gapi.auth2.getAuthInstance().signOut();
      }
    }

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
      });
      // that's the way we would do it if we could use the gapi.client
      // return window.gapi.client.sheets.spreadsheets.values.append({
      //  spreadsheetId: spreadsheetId,
      //  range: range,
      //  valueInputOption: 'USER_ENTERED',
      //  insertDataOption: 'INSERT_ROWS',
      //  resource: {
      //    values: [row]
      //  }
      // }, row);
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
      });
      // that's the way we would do it if we could use the gapi.client
      // return window.gapi.client.sheets.spreadsheets.values.get({
      //  spreadsheetId: spreadsheetId,
      //  range: range,
      // });
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
            console.log('No data found.');
            defer.reject('No data found');
          }
        }, (response) => {
          console.log('Error: ' + response.result.error.message);
          defer.reject(response.result.error);
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
