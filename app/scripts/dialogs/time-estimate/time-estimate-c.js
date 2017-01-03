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
  function TimeEstimateCtrl($mdDialog, task) {
    let vm = this;

    vm.task = task;
    vm.timeEstimate = task.timeEstimate;

    vm.submit = (estimate) => {
      task.timeEstimate = estimate;
      $mdDialog.hide();
    };

    vm.close = () => {
      $mdDialog.hide();
    };
  }
})();
