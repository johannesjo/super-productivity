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
  function DailySummaryCtrl($rootScope, $window, $localStorage, Tasks, $mdDialog) {
    const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';

    let vm = this;

    vm.todaysTasks = $rootScope.r.tasks;
    vm.backlogTasks = $rootScope.r.backlogTasks;
    vm.doneTasks = Tasks.getDoneToday();

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

      Tasks.finishDay(vm.clearDoneTasks, vm.moveUnfinishedToBacklog);

      // update just for fun
      vm.todaysTasks = $rootScope.r.tasks;
      vm.backlogTasks = $rootScope.r.backlogTasks;
      vm.doneTasks = Tasks.getDoneToday();

      $mdDialog.show(
        $mdDialog.alert()
          .clickOutsideToClose(false)
          .title('All Done! Shutting down now..')
          .textContent('You work is done. Time to go home!')
          .ariaLabel('Alert Shutdown')
          .ok('Aye aye!')
      )
        .then(() => {
          if (angular.isDefined(window.ipcRenderer)) {
            window.ipcRenderer.send(IPC_EVENT_SHUTDOWN);
          } else {
            $state.go('daily-planner');
          }
        });
    };
  }

})();
