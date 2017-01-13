/**
 * @ngdoc function
 * @name superProductivity.controller:JiraAddWorklogCtrl
 * @description
 * # JiraAddWorklogCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('JiraAddWorklogCtrl', JiraAddWorklogCtrl);

  /* @ngInject */
  function JiraAddWorklogCtrl($mdDialog, task, $window) {
    let vm = this;
    vm.taskCopy = angular.copy(task);
    console.log(vm.taskCopy);

    vm.taskCopy.started = new Date(task.started);

    vm.isUpdateLocalTaskSettings = false;

    vm.addWorklog = () => {
      if (vm.isUpdateLocalTaskSettings) {
        angular.extend(task, vm.taskCopy);
      }
      $mdDialog.hide(vm.taskCopy.originalKey, vm.taskCopy.started, vm.taskCopy.timeSpent, vm.comment);
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
