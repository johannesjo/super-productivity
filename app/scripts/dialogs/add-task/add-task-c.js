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
  function AddTaskCtrl($mdDialog, Tasks) {
    let vm = this;
    vm.task = {};

    vm.addTask = () => {
      let success = Tasks.addToday(vm.task);

      if (success) {
        $mdDialog.hide();
      }
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
