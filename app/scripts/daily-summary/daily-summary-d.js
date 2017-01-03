/**
 * @ngdoc directive
 * @name superProductivity.directive:dailySummary
 * @description
 * # dailySummary
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('dailySummary', dailySummary);

  /* @ngInject */
  function dailySummary() {
    return {
      templateUrl: 'scripts/daily-summary/daily-summary-d.html',
      bindToController: true,
      controller: DailySummaryCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {}
    };

  }

  /* @ngInject */
  function DailySummaryCtrl($rootScope, $window) {
    let vm = this;

    vm.doneTasks = $window._.filter($rootScope.r.tasks, (task) => {
      return task.isDone === true;
    });

    vm.todaysTasks = $rootScope.r.tasks;

  }

})();
