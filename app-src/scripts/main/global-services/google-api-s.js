/**
 * @ngdoc service
 * @name superProductivity.GoogleApi
 * @description
 * # GoogleApi
 * Service in the superProductivity.
 */
(() => {
  'use strict';

  // https://docs.google.com/spreadsheets/d/1l8SN-qcjhsCPZe7jn6U5N4NXyeVQVIT72ZS32QYllWM/edit?ouid=101280348348341717788&usp=sheets_home&ths=true

  class GoogleApi {
    /* @ngInject */
    constructor(GOOGLE, $q, IS_ELECTRON) {
      this.$q = $q;
      this.GOOGLE = GOOGLE;
      this.IS_ELECTRON = IS_ELECTRON;
    }

    initAllIfNotDone() {
      const defer = this.$q.defer();

      this.loadLib(() => {
        window.gapi.load('client:auth2', () => {

          this.initClient()
            .then(() => {
              // Listen for sign-in state changes.
              window.gapi.auth2.getAuthInstance().isSignedIn
                .listen(this.updateSigninStatus.bind(this));
              // Handle the initial sign-in state.
              this.updateSigninStatus.bind(this);

              defer.resolve();
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
      // Array of API discovery doc URLs for APIs used by the quickstart
      const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
      // Authorization scopes required by the API; multiple scopes can be
      // included, separated by spaces.
      const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly' +
        ' https://www.googleapis.com/auth/drive';

      return window.gapi.client.init({
        apiKey: this.GOOGLE.API_KEY,
        clientId: this.GOOGLE.CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      });

    }

    updateSigninStatus() {
      this.isSignedin = this.getSignedInStatus();
      console.log(this.isSignedin);
    }

    getSignedInStatus() {
      return window.gapi.auth2.getAuthInstance().isSignedIn.get();
    }

    login() {
      return this.initAllIfNotDone()
        .then(() => window.gapi.auth2.getAuthInstance().signIn({
          immediate: true
        }));
    }

    logout() {
      return window.gapi.auth2.getAuthInstance().signOut();
    }

    appendRow(spreadsheetId, row) {
      return window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: 'A1:Z99',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row]
        }
      }, row);
    }

    getSpreadsheetData(spreadsheetId, range) {
      return window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });
    }

    getSpreadsheetHeadingsAndLastRow(spreadsheetId) {
      const defer = this.$q.defer();

      this.getSpreadsheetData(spreadsheetId, 'A1:Z99')
        .then((response) => {
          const range = response.result;

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
