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
  function TaskSelectionCtrl($mdDialog, $localStorage, tasks) {
    let vm = this;

    $localStorage.$default({
      currentTask: null
    });

    vm.currentTask = $localStorage.currentTask;
    vm.tasks = tasks;

    vm.submit = (task) => {
      if (!task) {
        task = vm.tasks[0];
      }
      vm.currentTask = $localStorage.currentTask = task;
      $mdDialog.hide();
    };
  }
})();
