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
  function DailySummaryCtrl($rootScope, $window, $localStorage) {
    let vm = this;

    vm.todaysTasks = $rootScope.r.tasks;

    vm.doneTasks = $window._.filter($rootScope.r.tasks, (task) => {
      return task.isDone === true;
    });

    // calc total time spend on todays tasks
    vm.totalTimeSpendTasks = $window.moment.duration();
    for (let i = 0; i < vm.todaysTasks.length; i++) {
      let task = vm.todaysTasks[i];
      vm.totalTimeSpendTasks.add(task.timeSpend);
    }

    // calc time spend on todays tasks today
    // use mysql date as it is sortable
    let todayStr = $window.moment().format('YYYY-MM-DD');
    vm.totalTimeSpendToday = $window.moment.duration();
    for (let i = 0; i < vm.todaysTasks.length; i++) {
      let task = vm.todaysTasks[i];
      if (task.timeSpendOnDay && task.timeSpendOnDay[todayStr]) {
        vm.totalTimeSpendToday.add(task.timeSpendOnDay[todayStr]);
      }
    }

    vm.finishDay = () => {
      $localStorage.tomorrowsNote = vm.tomorrowsNote;


    };
  }

})();
