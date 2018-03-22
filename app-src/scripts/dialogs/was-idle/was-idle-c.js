/**
 * @ngdoc function
 * @name superProductivity.controller:WasIdleCtrl
 * @description
 * # WasIdleCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('WasIdleCtrl', WasIdleCtrl);

  /* @ngInject */
  function WasIdleCtrl($mdDialog, $rootScope, $scope, Tasks, $window, initialIdleTime, minIdleTimeInMs, theme, $filter, $interval) {
    const POLL_INTERVAL = 1000;

    let vm = this;
    vm.theme = theme;

    let realIdleTime = initialIdleTime;

    // used to display only; we add minIdleTimeInMs because that is idleTime too
    // even if it is tracked already
    vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask || $rootScope.r.lastActiveTaskTask || undefined;

    vm.trackIdleToTask = () => {
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

    let currentIdleStart = moment();
    const poll = $interval(() => {
      let now = moment();

      realIdleTime += moment.duration(now.diff(currentIdleStart))
        .asMilliseconds();
      vm.idleTime = $window.moment.duration(realIdleTime, 'milliseconds').format('hh:mm:ss');

      // set to now
      currentIdleStart = moment();
    }, POLL_INTERVAL);

    $scope.$on('$destroy', () => {
      $interval.cancel(poll);
    });
  }
})();
