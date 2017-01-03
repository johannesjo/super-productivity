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

    vm.submit = () => {
      if (!vm.selectedTask) {
        vm.selectedTask = vm.undoneTasks[0];
      }
      Tasks.updateCurrent(vm.selectedTask);
      $mdDialog.hide();
    };
  }
})();
