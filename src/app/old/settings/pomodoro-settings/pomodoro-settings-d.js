/**
 * @ngdoc directive
 * @name superProductivity.directive:pomodoroSettings
 * @description
 * # pomodoroSettings
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('pomodoroSettings', pomodoroSettings);

  /* @ngInject */
  function pomodoroSettings() {
    return {
      template: require('./pomodoro-settings-d.html'),
      bindToController: true,
      controller: PomodoroSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        settings: '='
      }
    };
  }

  /* @ngInject */
  function PomodoroSettingsCtrl(IS_ELECTRON, PomodoroButton) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;

    vm.onIsEnabledChange = (isEnabled) => {
      if (!isEnabled) {
        PomodoroButton.stop();
      }
    };
  }

})();
