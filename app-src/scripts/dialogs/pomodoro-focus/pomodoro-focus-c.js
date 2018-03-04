/**
 * @ngdoc function
 * @name superProductivity.controller:PomodoroFocusCtrl
 * @description
 * # PomodoroFocusCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('PomodoroFocusCtrl', PomodoroFocusCtrl);

  /* @ngInject */
  function PomodoroFocusCtrl($mdDialog, $rootScope, theme, pomodoroData, pomodoroConfig, $scope, $timeout, IS_ELECTRON, PomodoroButton, Notifier, Tasks) {
    this.r = $rootScope.r;
    this.theme = theme;
    this.pomodoroData = pomodoroData;
    this.isShowDistractionsOnFocus = pomodoroConfig.isShowDistractionsOnFocus;
    this.isFocusDone = false;

    this.currentTask = Tasks.getCurrent();
    this.task = Tasks.getCurrent() || Tasks.getLastCurrent();

    console.log(this.r);

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
        this.isFocusDone = true;
        if (pomodoroConfig.isManualContinue) {
          if (IS_ELECTRON) {
            window.ipcRenderer.send('SHOW_OR_FOCUS');
          }
          Notifier({
            title: 'Pomodoro break ended',
            sound: true,
            wait: true
          });

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
