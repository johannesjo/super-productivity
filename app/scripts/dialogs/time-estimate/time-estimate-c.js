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
    vm.timeSpend = task.timeSpend;

    vm.submit = (estimate, timeSpend) => {
      task.timeEstimate = estimate;

      task.timeSpend = timeSpend;

      if (isTasksForToday) {
        Tasks.updateTimeSpendToday(task, timeSpend);
      }

      $mdDialog.hide();
    };

    vm.close = () => {
      $mdDialog.hide();
    };
  }
})();
