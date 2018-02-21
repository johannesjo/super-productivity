/**
 * @ngdoc function
 * @name superProductivity.controller:PomodoroBreakCtrl
 * @description
 * # PomodoroBreakCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('PomodoroBreakCtrl', PomodoroBreakCtrl);

  /* @ngInject */
  function PomodoroBreakCtrl($mdDialog, $rootScope, theme, pomodoroData, pomodoroConfig, $scope, $timeout, IS_ELECTRON, PomodoroButton) {
    this.r = $rootScope.r;
    this.theme = theme;
    this.pomodoroData = pomodoroData;
    this.isShowDistractionsOnBreak = pomodoroConfig.isShowDistractionsOnBreak;
    this.isBreakDone = false;

    if (IS_ELECTRON) {
      window.ipcRenderer.send('SHOW_OR_FOCUS');
    }

    if (this.pomodoroData.currentSessionTime) {
      // close 100 ms earlier to prevent next session time from being displayed
      let timeoutDuration = this.pomodoroData.currentSessionTime - 100;

      // prevent negative timeouts
      if (timeoutDuration < 0) {
        timeoutDuration = 0;
      }

      this.timeout = $timeout(() => {
        this.isBreakDone = true;

        if (pomodoroConfig.isManualContinue) {
          this.pomodoroData.currentSessionTime = 0;
          PomodoroButton.pause();
        } else {
          $mdDialog.hide();
        }
      }, timeoutDuration);
    }

    this.cancel = () => {
      $mdDialog.hide();
    };

    this.continue = () => {
      $mdDialog.hide(true);
    };

    $scope.$on('$destroy', () => {
      if (this.timeout) {
        $timeout.cancel(this.timeout);
      }
    });
  }
})();
