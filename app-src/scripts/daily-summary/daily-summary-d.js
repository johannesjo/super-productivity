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
      scope: true
    };

  }

  /* @ngInject */
  function DailySummaryCtrl($localStorage, Tasks, TasksUtil, $mdDialog, Dialogs, $state, GitLog, IS_ELECTRON) {
    const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';

    let vm = this;

    vm.todayStr = TasksUtil.getTodayStr();
    vm.doneTasks = Tasks.getDoneToday();

    // calc total time spent on todays tasks
    vm.totalTimeSpentTasks = Tasks.getTotalTimeWorkedOnTasksToday();

    // calc time spent on todays tasks today
    // use mysql date as it is sortable
    vm.totalTimeSpentToday = Tasks.getTimeWorkedToday();

    if ($localStorage.git && $localStorage.git.projectDir) {
      GitLog.get($localStorage.git.projectDir).then(function (res) {
        vm.commitLog = res;
      });
    }

    vm.showExportModal = () => {
      Dialogs('SIMPLE_TASK_SUMMARY', {
        settings: $localStorage.uiHelper.dailyTaskExportSettings,
        tasks: Tasks.getToday()
      }, true);
    };

    vm.finishDay = () => {
      $localStorage.tomorrowsNote = vm.tomorrowsNote;

      Tasks.finishDay(vm.clearDoneTasks, vm.moveUnfinishedToBacklog);

      if (IS_ELECTRON) {
        $mdDialog.show(
          $mdDialog.confirm()
            .clickOutsideToClose(false)
            .title('All Done! Shutting down now..')
            .textContent('You work is done. Time to go home!')
            .ariaLabel('Alert Shutdown')
            .ok('Aye aye! Shutdown!')
            .cancel('No, just clear the tasks')
        )
          .then(() => {
              window.ipcRenderer.send(IPC_EVENT_SHUTDOWN);
            },
            () => {
              $state.go('daily-planner');
            });
      } else {
        $state.go('daily-planner');
      }
    };
  }

})();
