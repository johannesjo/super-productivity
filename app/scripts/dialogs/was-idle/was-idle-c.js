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
  function WasIdleCtrl($mdDialog, Tasks, idleTime, $window) {
    let vm = this;

    vm.idleTime = $window.moment.duration({ milliseconds: idleTime });

    Tasks.getUndoneToday().then((tasks) => {
      vm.undoneTasks = tasks;
    });

    vm.trackIdleToTask = () => {
      let timeSpendCalculated = $window.moment.duration(vm.selectedTask.timeSpend);
      timeSpendCalculated.add(vm.idleTime);
      vm.selectedTask.timeSpend = timeSpendCalculated;

      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
