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
  function PomodoroFocusCtrl($mdDialog, $rootScope, theme, pomodoroData, pomodoroConfig, $scope, $timeout, IS_ELECTRON, PomodoroButton, Notifier, Tasks, SimpleToast) {
    this.r = $rootScope.r;
    this.theme = theme;
    this.pomodoroData = pomodoroData;
    this.currentTask = Tasks.getCurrent();
    this.task = Tasks.getCurrent() || Tasks.getLastCurrent();

    this.togglePlay = () => {
      PomodoroButton.toggle();
    };

    this.markAsDone = () => {
      Tasks.markAsDone(this.task);
      this.task = Tasks.getCurrent() || Tasks.getLastCurrent();
      if (this.task.isDone) {
        SimpleToast('SUCCESS', 'All tasks done for today, create some new if you have to!')
        $mdDialog.hide();
      }
    };

    this.cancel = () => {
      $mdDialog.hide();
    };

    $scope.$on('$destroy', () => {
      if (this.timeout) {
        $timeout.cancel(this.timeout);
      }
    });
  }
})();
