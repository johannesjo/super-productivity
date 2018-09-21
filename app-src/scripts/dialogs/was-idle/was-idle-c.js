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
  function WasIdleCtrl($mdDialog, $rootScope, Tasks, $window, initialIdleTime, theme, $filter, $interval, TakeABreakReminder, TimeTracking) {
    let vm = this;
    vm.theme = theme;


    // used to display idle time
    vm.TimeTracking = TimeTracking;

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask || $rootScope.r.lastActiveTaskTask || undefined;

    vm.isShowTrackButResetTakeABreakTimer = TakeABreakReminder.isEnabled();

    vm.trackIdleToTask = (isResetTakeABreakTimer) => {
      if (vm.selectedTask && vm.selectedTask.id) {
        $mdDialog.hide({
          isResetTakeABreakTimer,
          selectedTask: vm.selectedTask
        });
      } else if ((!vm.selectedTask || !vm.selectedTask.id) && vm.searchText.length > 0) {
        $mdDialog.hide({
          isResetTakeABreakTimer,
          selectedTask: Tasks.addToday({
            title: vm.searchText
          })
        });
      }
    };

    vm.getFilteredUndoneTasks = (searchText) => {
      return searchText ? $filter('filter')(vm.undoneTasks, searchText, false) : vm.undoneTasks;
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
