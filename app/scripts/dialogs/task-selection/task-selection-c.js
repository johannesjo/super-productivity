/**
 * @ngdoc function
 * @name superProductivity.controller:TaskSelectionCtrl
 * @description
 * # TaskSelectionCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TaskSelectionCtrl', TaskSelectionCtrl);

  /* @ngInject */
  function TaskSelectionCtrl($mdDialog, Tasks, $window, tasks) {
    let vm = this;

    vm.undoneTasks = $window._.filter(tasks, (task) => {
      return task && !task.isDone;
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
