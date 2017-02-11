/**
 * @ngdoc directive
 * @name superProductivity.directive:gitSettings
 * @description
 * # gitSettings
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('gitSettings', gitSettings);

  /* @ngInject */
  function gitSettings() {
    return {
      templateUrl: 'scripts/settings/git-settings/git-settings-d.html',
      bindToController: true,
      controller: GitSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        settings: '='
      }
    };
  }

  /* @ngInject */
  function GitSettingsCtrl(IS_ELECTRON) {
    const vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;

  }

})();
