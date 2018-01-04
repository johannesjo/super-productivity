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
  function PomodoroBreakCtrl($mdDialog, $rootScope, theme, pomodoroData, pomodoroConfig, $scope, $timeout) {
    this.r = $rootScope.r;
    this.theme = theme;
    this.pomodoroData = pomodoroData;
    this.isShowDistractionsOnBreak = pomodoroConfig.isShowDistractionsOnBreak;

    if (this.pomodoroData.currentSessionTime) {
      // close 500 ms earlier to prevent next session time from being displayed
      let timeoutDuration = this.pomodoroData.currentSessionTime - 500;

      // prevent negative timeouts
      if (timeoutDuration < 0) {
        timeoutDuration = 0;
      }

      this.timeout = $timeout(() => {
        $mdDialog.hide();
      }, timeoutDuration);
    }

    this.cancel = () => {
      $mdDialog.hide();
    };

    this.continue = ()=>{
      $mdDialog.hide(true);
    };

    $scope.$on('$destroy', () => {
      if (this.timeout) {
        $timeout.cancel(this.timeout);
      }
    });
  }
})();
