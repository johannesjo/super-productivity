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

    vm.idleTime = $window.moment.duration({ milliseconds: idleTime });

    Tasks.getUndoneToday().then((tasks) => {
      vm.undoneTasks = tasks;
      vm.selectedTask = $rootScope.r.currentTask;
      console.log('WAS_IDLE_CTRL', vm.selectedTask);
    });

    vm.trackIdleToTask = () => {
      let timeSpendCalculated = $window.moment.duration(vm.selectedTask.timeSpend);
      timeSpendCalculated.add(vm.idleTime);
      vm.selectedTask.timeSpend = timeSpendCalculated;

      // set current task to the selected one
      Tasks.updateCurrent(vm.selectedTask);
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
