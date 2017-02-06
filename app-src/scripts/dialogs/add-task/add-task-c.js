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
      if (vm.isAddToBacklog) {
        Tasks.addNewToTopOfBacklog(vm.task);
      } else {
        Tasks.addToday(vm.task);
      }

      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
