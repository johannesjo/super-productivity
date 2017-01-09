/**
 * @ngdoc function
 * @name superProductivity.controller:TimeEstimateCtrl
 * @description
 * # TimeEstimateCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TimeEstimateCtrl', TimeEstimateCtrl);

  /* @ngInject */
  function TimeEstimateCtrl($mdDialog, task, isTasksForToday, Tasks) {
    let vm = this;

    vm.task = task;
    vm.timeEstimate = task.timeEstimate;
    vm.timeSpent = task.timeSpent;

    vm.submit = (estimate, timeSpent) => {
      task.timeEstimate = estimate;

      task.timeSpent = timeSpent;

      if (isTasksForToday) {
        Tasks.updateTimeSpentToday(task, timeSpent);
      }

      $mdDialog.hide();
    };

    vm.close = () => {
      $mdDialog.hide();
    };
  }
})();
