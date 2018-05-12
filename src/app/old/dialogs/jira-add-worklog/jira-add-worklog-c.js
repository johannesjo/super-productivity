/**
 * @ngdoc function
 * @name superProductivity.controller:JiraAddWorklogCtrl
 * @description
 * # JiraAddWorklogCtrl
 * Controller of the superProductivity
 */
import moment from 'moment';

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('JiraAddWorklogCtrl', JiraAddWorklogCtrl);

  /* @ngInject */
  function JiraAddWorklogCtrl($mdDialog, task, $window, comment, theme) {
    let vm = this;

    vm.theme = theme;
    vm.taskCopy = angular.copy(task);
    vm.taskCopy.started = moment(task.started).milliseconds(0).seconds(0).toDate();
    vm.isUpdateLocalTaskSettings = false;
    vm.comment = comment;

    vm.addWorklog = () => {
      $mdDialog.hide({
        originalKey: vm.taskCopy.originalKey,
        started: moment(vm.taskCopy.started),
        timeSpent: moment.duration(vm.taskCopy.timeSpent),
        comment: vm.comment
      });
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
