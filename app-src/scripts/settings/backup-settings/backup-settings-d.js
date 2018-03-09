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
  function BackupSettingsCtrl(AppStorage, IS_ELECTRON, GoogleApi) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);
      AppStorage.importData(settings);
    };

    vm.test = () => {
      GoogleApi.saveFile({
        title: 'SUPER_PRODUCTIVITY_SYNC.json',
        id: null,
        editable: true
      }, {
        test: 'DDDDDDDDDDDDDDDDDDDDDDDDD'
      })
        .then((res) => console.log(res));
    };

    vm.login = () => {
      vm.isLoading = true;
      return GoogleApi.login()
        .then(() => {
          vm.isLoggedIn = true;
          vm.isLoading = false;
        });
    };

    vm.logout = () => {
      vm.isLoading = true;
      GoogleApi.logout()
        .then(() => {
          vm.isLoggedIn = false;
          vm.isLoading = false;
        });
    };
  }

})();
