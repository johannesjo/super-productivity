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
  function DailySummaryCtrl($rootScope, $window, $localStorage, Tasks, $mdDialog, $state, GitLog) {
    const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';

    let vm = this;

    vm.r = $rootScope.r;

    // TODO rewrite this
    vm.todaysTasks = $rootScope.r.tasks;
    vm.backlogTasks = $rootScope.r.backlogTasks;
    vm.doneTasks = Tasks.getDoneToday();

    // calc total time spent on todays tasks
    vm.totalTimeSpentTasks = $window.moment.duration();
    for (let i = 0; i < vm.todaysTasks.length; i++) {
      let task = vm.todaysTasks[i];
      vm.totalTimeSpentTasks.add(task.timeSpent);
    }

    // calc time spent on todays tasks today
    // use mysql date as it is sortable
    let todayStr = $window.moment().format('YYYY-MM-DD');
    vm.totalTimeSpentToday = $window.moment.duration();
    for (let i = 0; i < vm.todaysTasks.length; i++) {
      let task = vm.todaysTasks[i];
      if (task.timeSpentOnDay && task.timeSpentOnDay[todayStr]) {
        vm.totalTimeSpentToday.add(task.timeSpentOnDay[todayStr]);
      }
    }

    GitLog.get('/home/johannes/www/super-productivity').then(function (res) {
      vm.commitLog = res;
    });

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
