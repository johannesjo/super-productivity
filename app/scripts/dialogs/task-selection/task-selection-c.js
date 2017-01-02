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
  function TaskSelectionCtrl($mdDialog, $localStorage, $window, tasks) {
    let vm = this;

    $localStorage.$default({
      currentTask: null
    });

    vm.undoneTasks = $window._.filter(tasks, (task) => {
      return task && !task.isDone;
    });

    vm.submit = (task) => {
      if (!task) {
        task = vm.undoneTasks[0];
      }
      vm.currentTask = $localStorage.currentTask = task;
      $mdDialog.hide();
    };
  }
})();
