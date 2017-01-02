/**
 * @ngdoc function
 * @name superProductivity.controller:TaskSelectionCtrl
 * @description
 * # TaskSelectionCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TaskSelectionCtrl', TaskSelectionCtrl);

  /* @ngInject */
  function TaskSelectionCtrl($mdDialog, Tasks) {
    let vm = this;

    Tasks.getUndoneToday().then((tasks) => {
      vm.undoneTasks = tasks;
    });

    vm.submit = (task) => {
      if (!task) {
        task = vm.undoneTasks[0];
      }
      vm.currentTask = task;
      Tasks.updateCurrent(vm.currentTask);
      $mdDialog.hide();
    };
  }
})();
