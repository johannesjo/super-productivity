/**
 * @ngdoc directive
 * @name superProductivity.directive:timeTrackingHistory
 * @description
 * # timeTrackingHistory
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('timeTrackingHistory', timeTrackingHistory);

  /* @ngInject */
  function timeTrackingHistory() {
    return {
      templateUrl: 'scripts/agenda-and-history/time-tracking-history/time-tracking-history-d.html',
      bindToController: true,
      controller: TimeTrackingHistoryCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function TimeTrackingHistoryCtrl(Tasks) {
    let vm = this;

    vm.worklog = Tasks.getCompleteWorkLog();

    console.log(vm.worklog);


  }

})();
