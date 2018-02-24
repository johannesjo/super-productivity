/**
 * @ngdoc directive
 * @name superProductivity.directive:dailySummary
 * @description
 * # dailySummary
 */

(function() {
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
  function DailySummaryCtrl($rootScope, Tasks, TasksUtil, $mdDialog, Dialogs, $state, GitLog, IS_ELECTRON, $timeout, $scope, AppStorage) {
    const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';
    const SUCCESS_ANIMATION_DURATION = 500;

    let successAnimationTimeout;
    let vm = this;

    vm.todayStr = TasksUtil.getTodayStr();
    vm.doneTasks = Tasks.getDoneToday();

    // calc total time spent on todays tasks
    vm.totalTimeSpentTasks = Tasks.getTotalTimeWorkedOnTasksToday();

    // calc time spent on todays tasks today
    // use mysql date as it is sortable
    vm.totalTimeSpentToday = Tasks.getTimeWorkedToday();

    if ($rootScope.r.git && $rootScope.r.git.projectDir) {
      GitLog.get($rootScope.r.git.projectDir).then(function(res) {
        vm.commitLog = res;
      });
    }

    vm.showExportModal = () => {
      Dialogs('SIMPLE_TASK_SUMMARY', {
        settings: $rootScope.r.uiHelper.dailyTaskExportSettings,
        finishDayFn: vm.finishDay,
        tasks: Tasks.getToday()
      }, true);
    };

    vm.showTimeSheetExportModal = () => {
      Dialogs('TIME_SHEET_EXPORT', {
        settings: $rootScope.r.uiHelper.dailyTaskExportSettings,
        finishDayFn: vm.finishDay,
        tasks: Tasks.getToday()
      }, true);
    };

    setTimeout(vm.showTimeSheetExportModal,500);


    vm.finishDay = () => {
      $rootScope.r.tomorrowsNote = vm.tomorrowsNote;

      Tasks.finishDay(vm.clearDoneTasks, vm.moveUnfinishedToBacklog);

      // save everything
      AppStorage.saveToLs();

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
              initSuccessAnimation(() => {
                window.ipcRenderer.send(IPC_EVENT_SHUTDOWN);
              });
            },
            () => {
              initSuccessAnimation(() => {
                $state.go('daily-planner');
              });
            });
      } else {
        initSuccessAnimation(() => {
          $state.go('daily-planner');
        });
      }
    };

    $scope.$on('$destroy', () => {
      if (successAnimationTimeout) {
        $timeout.cancel(successAnimationTimeout);
      }
    });

    function initSuccessAnimation(cb) {
      vm.showSuccessAnimation = true;
      successAnimationTimeout = $timeout(() => {
        if (cb) {
          cb();
        }
      }, SUCCESS_ANIMATION_DURATION);

    }
  }

})();
