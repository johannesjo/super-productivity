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
  function TimeTrackingHistoryCtrl(Tasks, Dialogs, $localStorage, $scope, EV_PROJECT_CHANGED) {
    let vm = this;
    vm.worklog = Tasks.getCompleteWorkLog();

    vm.createTasksForDay = (data) => {
      let tasks = [];
      const dayData = angular.copy(data);

      _.each(dayData.entries, (entry) => {
        let task = entry.task;
        task.timeSpent = entry.timeSpent;
        task.dateStr = dayData.dateStr;
        tasks.push(task);
      });

      return tasks;
    };

    vm.createTasksForMonth = (data) => {
      let tasks = [];
      const monthData = angular.copy(data);
      _.each(monthData.entries, (entry) => {
        tasks = tasks.concat(vm.createTasksForDay(entry));
      });
      return tasks;
    };

    vm.exportData = (type, data) => {
      if (type === 'MONTH') {
        const tasks = vm.createTasksForMonth(data);

        Dialogs('SIMPLE_TASK_SUMMARY', {
          settings: $localStorage.uiHelper.timeTrackingHistoryExportSettings,
          tasks: tasks,
          finishDayFn: false
        }, true);
      }
    };

    $scope.$on(EV_PROJECT_CHANGED, () => {
      vm.worklog = Tasks.getCompleteWorkLog();
    });
  }

})();
