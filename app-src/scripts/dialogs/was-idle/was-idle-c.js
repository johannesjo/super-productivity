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
  function WasIdleCtrl($mdDialog, $rootScope, $scope, Tasks, $window, idleTime, minIdleTimeInMs, theme) {
    let vm = this;
    vm.theme = theme;
    const IPC_EVENT_IDLE = 'WAS_IDLE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';

    let realIdleTime = (idleTime + minIdleTimeInMs);

    // used to display only; we add minIdleTimeInMs because that is idleTime too
    // even if it is tracked already
    vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask || undefined;

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

    $scope.$on('$destroy', () => {
      window.ipcRenderer.removeListener(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, updateOnPing);
      window.ipcRenderer.removeListener(IPC_EVENT_IDLE, updateOnIdle);
    });

    function updateOnPing(ev, evData) {
      let timeSpentInMs = evData.timeSpentInMs;
      idleTime = idleTime + timeSpentInMs + 5000;
      realIdleTime = (idleTime + minIdleTimeInMs);
      vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');
      $scope.$digest();
    }

    function updateOnIdle(ev, params) {
      idleTime = idleTime + params.idleTimeInMs;
      realIdleTime = (idleTime + minIdleTimeInMs);
      vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');
      $scope.$digest();
    }

    // add regular ping until response
    window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, updateOnPing);

    // add additional idle until response
    window.ipcRenderer.on(IPC_EVENT_IDLE, updateOnIdle);
  }
})();
