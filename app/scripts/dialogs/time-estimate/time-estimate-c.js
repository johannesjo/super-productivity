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
  function TimeEstimateCtrl($mdDialog, task, $window) {
    let vm = this;

    let todayStr = $window.moment().format('YYYY-MM-DD');

    vm.task = task;
    vm.timeEstimate = task.timeEstimate;
    vm.timeSpend = task.timeSpend;

    vm.submit = (estimate, timeSpend) => {
      task.timeEstimate = estimate;

      if (timeSpend && timeSpend !== task.timeSpend) {
        task.timeSpend = timeSpend;
        task.lastWorkedOn = $window.moment();
        task.timeSpendOnDay = {};
        task.timeSpendOnDay[todayStr] = timeSpend;
      }

      $mdDialog.hide();
    };

    vm.close = () => {
      $mdDialog.hide();
    };
  }
})();
