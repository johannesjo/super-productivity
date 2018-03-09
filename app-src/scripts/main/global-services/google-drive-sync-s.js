/**
 * @ngdoc service
 * @name superProductivity.GoogleDriveSync
 * @description
 * # GoogleDriveSync
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const SYNC_FILE_NAME = 'SUPER_PRODUCTIVITY_SYNC.json';

  class GoogleDriveSync {
    /* @ngInject */
    constructor(AppStorage, GoogleApi, $rootScope, SimpleToast, $q) {
      this.AppStorage = AppStorage;
      this.GoogleApi = GoogleApi;
      this.$rootScope = $rootScope;
      this.SimpleToast = SimpleToast;
      this.$q = $q;

      if (this.$rootScope.r.config.googleDriveSync.isAutoLogin) {
        GoogleApi.login();
      }

    }

    getLocalAppData() {
      return this.AppStorage.getCompleteBackupData();
    }

    saveTo() {
      return this.GoogleApi.saveFile(this.getLocalAppData(), {
        title: SYNC_FILE_NAME,
        id: this.$rootScope.r.googleDriveSync.backupDocId,
        editable: true
      })
        .then((res) => {
          if (res && res.data) {
            this.$rootScope.r.googleDriveSync.backupDocId = res.data.id;
          }
        });
    }

    loadFrom() {
      return this.GoogleApi.loadFile(this.$rootScope.r.googleDriveSync.backupDocId)
        .then((res) => {
          console.log(res);
          return this.$q.when(res);
        });
    }
  }

  angular
    .module('superProductivity')
    .service('GoogleDriveSync', GoogleDriveSync);

  // hacky fix for ff
  GoogleDriveSync.$$ngIsClass = true;
})();
