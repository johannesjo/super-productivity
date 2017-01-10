/**
 * @ngdoc function
 * @name superProductivity.controller:AddTaskCtrl
 * @description
 * # AddTaskCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('AddTaskCtrl', AddTaskCtrl);

  /* @ngInject */
  function AddTaskCtrl($mdDialog, Tasks, SimpleToast) {
    let vm = this;
    vm.task = {};

    vm.addTask = () => {
      let success = Tasks.addToday(vm.task);

      if (success) {
        SimpleToast('Created task "' + vm.task.title + '"');
        $mdDialog.hide();
      }
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
