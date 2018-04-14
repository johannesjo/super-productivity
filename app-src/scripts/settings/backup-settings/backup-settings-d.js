/**
 * @ngdoc directive
 * @name superProductivity.directive:backupSettings
 * @description
 * # backupSettings
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('backupSettings', backupSettings);

  /* @ngInject */
  function backupSettings() {
    return {
      templateUrl: 'scripts/settings/backup-settings/backup-settings-d.html',
      bindToController: true,
      controller: BackupSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        settings: '='
      }
    };
  }

  /* @ngInject */
  function BackupSettingsCtrl(AppStorage, IS_ELECTRON, GoogleApi, GoogleDriveSync, SimpleToast, $timeout) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;

    $timeout(() => {
      vm.tmpSyncFile = vm.settings.googleDriveSync.syncFileName;
    });

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);
      AppStorage.importData(settings);
    };

    vm.backupNow = () => {
      return GoogleDriveSync.saveTo()
        .then(() => {
          SimpleToast('SUCCESS', 'Google Drive: Successfully saved backup');
        });
    };
    vm.loadRemoteData = () => {
      return GoogleDriveSync.loadFrom();
    };

    vm.login = () => {
      return GoogleApi.login();
    };

    vm.logout = () => {
      return GoogleApi.logout();
    };

    vm.onGoogleDriveSyncToggle = (isEnabled) => {
      if (isEnabled) {
        GoogleDriveSync.resetAutoSyncToRemoteInterval();
      } else {
        GoogleDriveSync.cancelAutoSyncToRemoteIntervalIfSet();
      }
    };

    vm.onLocalSyncToggle = (isEnabled) => {
      if (isEnabled) {
        AppStorage.resetAutoSyncToRemoteInterval();
      } else {
        AppStorage.cancelAutoSyncToRemoteIntervalIfSet();
      }
    };

    vm.resetSync = () => {
      GoogleDriveSync.resetAutoSyncToRemoteInterval();
    };

    vm.changeSyncFileName = (newSyncFile) => {
      GoogleDriveSync.changeSyncFileName(newSyncFile);
    };

    vm.GoogleApi = GoogleApi;
  }

})();
