/**
 * @ngdoc function
 * @name superProductivity.controller:WasIdleCtrl
 * @description
 * # WasIdleCtrl
 * Controller of the superProductivity
 */


import moment from 'moment';

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('WasIdleCtrl', WasIdleCtrl);

  /* @ngInject */
  function WasIdleCtrl($mdDialog, $rootScope, $scope, Tasks, $window, initialIdleTime, minIdleTimeInMs, theme, $filter, $interval, TakeABreakReminder) {
    const POLL_INTERVAL = 1000;

    let vm = this;
    vm.theme = theme;

    let realIdleTime = initialIdleTime;

    // used to display only; we add minIdleTimeInMs because that is idleTime too
    // even if it is tracked already
    vm.idleTime = moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask || $rootScope.r.lastActiveTaskTask || undefined;

    vm.isShowTrackButResetTakeABreakTimer = TakeABreakReminder.isEnabled();

    vm.trackIdleToTask = (isResetTakeABreakTimer) => {
      if (isResetTakeABreakTimer) {
        TakeABreakReminder.resetCounter();
      }

      if (vm.selectedTask && vm.selectedTask.id) {
        // add the idle time in milliseconds + the minIdleTime that was
        // not tracked or removed
        Tasks.addTimeSpent(vm.selectedTask, realIdleTime);
        // set current task to the selected one
        Tasks.updateCurrent(vm.selectedTask);

        $mdDialog.hide();
      }
    };

    vm.getFilteredUndoneTasks = (searchText) => {
      return searchText ? $filter('filter')(vm.undoneTasks, searchText, false) : vm.undoneTasks;
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };

    const idleStart = moment();
    const poll = $interval(() => {
      let now = moment();
      realIdleTime = moment
        .duration(now.diff(idleStart))
        .add(initialIdleTime)
        .asMilliseconds();
      vm.idleTime = moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');
    }, POLL_INTERVAL);

    $scope.$on('$destroy', () => {
      $interval.cancel(poll);
    });
  }
})();
