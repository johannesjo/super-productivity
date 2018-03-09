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
    constructor(AppStorage, GoogleApi, $rootScope) {
      this.AppStorage = AppStorage;
      this.GoogleApi = GoogleApi;
      this.$rootScope = $rootScope;
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
      return this.GoogleApi.loadFile(this.$rootScope.r.googleDriveSync.backupDocId);
    }
  }

  angular
    .module('superProductivity')
    .service('GoogleDriveSync', GoogleDriveSync);

  // hacky fix for ff
  GoogleDriveSync.$$ngIsClass = true;
})();
