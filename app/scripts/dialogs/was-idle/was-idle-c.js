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
  function WasIdleCtrl($mdDialog, $rootScope, Tasks, $window, idleTime) {
    let vm = this;

    vm.idleTime = $window.moment.duration(idleTime, 'milliseconds');

    vm.undoneTasks = Tasks.getUndoneToday(true);
    vm.selectedTask = $rootScope.r.currentTask;

    vm.trackIdleToTask = () => {
      // add the idle time in milliseconds
      Tasks.addTimeSpent(vm.selectedTask, idleTime);
      // set current task to the selected one
      Tasks.updateCurrent(vm.selectedTask);
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
