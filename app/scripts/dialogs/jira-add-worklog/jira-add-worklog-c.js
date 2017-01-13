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
    vm.taskCopy.started = new Date(task.started);
    vm.isUpdateLocalTaskSettings = false;

    vm.addWorklog = () => {
      $mdDialog.hide({
        originalKey: vm.taskCopy.originalKey,
        started: $window.moment(vm.taskCopy.started),
        timeSpent: $window.moment.duration(vm.taskCopy.timeSpent),
        comment: vm.comment
      });

      if (vm.isUpdateLocalTaskSettings) {
        angular.extend(task, vm.taskCopy);
        task.started = $window.moment(vm.taskCopy.started);
        task.timeSpent = $window.moment.duration(vm.taskCopy.timeSpent);
      }
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
