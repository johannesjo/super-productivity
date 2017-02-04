/**
 * @ngdoc directive
 * @name superProductivity.directive:backupSettings
 * @description
 * # backupSettings
 */

(function () {
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
      scope: {}
    };
  }

  /* @ngInject */
  function BackupSettingsCtrl($localStorage) {
    let vm = this;

    // import/export stuff
    vm.importSettings = (uploadSettingsTextarea) => {
      let settings = JSON.parse(uploadSettingsTextarea);

      _.forOwn(settings, (val, key) => {
        $localStorage[key] = val;
      });

      // reload page completely afterwards
      window.location.reload(true);
    };
  }

})();
