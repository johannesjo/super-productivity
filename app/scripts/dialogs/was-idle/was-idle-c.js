/**
 * @ngdoc function
 * @name superProductivity.controller:WasIdleCtrl
 * @description
 * # WasIdleCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('WasIdleCtrl', WasIdleCtrl);

  /* @ngInject */
  function WasIdleCtrl($mdDialog, $rootScope, Tasks, $window, idleTime, minIdleTimeInMs) {
    let vm = this;
    const realIdleTime = (idleTime + minIdleTimeInMs);

    // used to display only; we add minIdleTimeInMs because that is idleTime too
    // even if it is tracked already
    vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds');

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask;

    vm.trackIdleToTask = () => {
      if (vm.selectedTask) {
        if ($rootScope.r.currentTask) {
          // we need remove the possibly falsely tracked time from the previous current task
          Tasks.removeTimeSpent($rootScope.r.currentTask, minIdleTimeInMs);
        }

        // add the idle time in milliseconds + the minIdleTime that was
        // not tracked or removed
        Tasks.addTimeSpent(vm.selectedTask, realIdleTime);
        // set current task to the selected one
        Tasks.updateCurrent(vm.selectedTask);

        $mdDialog.hide();
      }
    };

    vm.cancel = () => {
      // remove min idle time when it was tracked before
      if ($rootScope.r.currentTask) {
        Tasks.removeTimeSpent($rootScope.r.currentTask, minIdleTimeInMs);
      }
      $mdDialog.cancel();
    };
  }
})();
