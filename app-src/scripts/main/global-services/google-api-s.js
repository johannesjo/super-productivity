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
  const SPREADSHEET_ID = '1l8SN-qcjhsCPZe7jn6U5N4NXyeVQVIT72ZS32QYllWM';

  class GoogleApi {
    /* @ngInject */
    constructor(GOOGLE, $q) {
      this.$q = $q;
      this.GOOGLE = GOOGLE;
      console.log('GOOGLE CONSTRUCTOR');
      gapi.load('client:auth2', this.initClient.bind(this));
    }

    initClient() {
      console.log(this);

      // Array of API discovery doc URLs for APIs used by the quickstart
      const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
      // Authorization scopes required by the API; multiple scopes can be
      // included, separated by spaces.
      const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly' +
        ' https://www.googleapis.com/auth/drive';

      gapi.client.init({
        //apiKey: this.GOOGLE.API_KEY,
        clientId: this.GOOGLE.CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      }).then(() => {
        console.log('INIT DONE');

        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));

        // Handle the initial sign-in state.
        this.updateSigninStatus.bind(this);
      });
    }

    updateSigninStatus() {
      this.isSignedin = this.getSignedInStatus();
      console.log(this.isSignedin);
    }

    getSignedInStatus() {
      return gapi.auth2.getAuthInstance().isSignedIn.get();
    }

    login() {
      return gapi.auth2.getAuthInstance().signIn()
        .then(() => {
          console.log('CB');
        });
    }

    logout() {
      return gapi.auth2.getAuthInstance().signOut();
    }

    getSpreadsheetData(spreadsheetId, range) {
      return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      });
    }

    getSpreadsheetHeadings() {
      console.log('getSpreadsheetHeadings');
      console.log(this);

      const defer = this.$q.defer();

      this.getSpreadsheetData(SPREADSHEET_ID, 'A1:Z2')
        .then((response) => {
          const range = response.result;

          if (range.values && range.values[0]) {
            defer.resolve(range.values[0]);
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
