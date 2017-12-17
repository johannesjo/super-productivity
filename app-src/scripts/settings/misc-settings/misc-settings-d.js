/**
 * @ngdoc directive
 * @name superProductivity.directive:miscSettings
 * @description
 * # miscSettings
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('miscSettings', miscSettings);

  /* @ngInject */
  function miscSettings() {
    return {
      templateUrl: 'scripts/settings/misc-settings/misc-settings-d.html',
      bindToController: true,
      controller: MiscSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        settings: '='
      }
    };
  }

  /* @ngInject */
  function MiscSettingsCtrl(IS_ELECTRON) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;
    console.log(vm);

  }

})();
