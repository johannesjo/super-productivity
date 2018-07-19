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
  function DailySummaryCtrl($rootScope, Tasks, TasksUtil, $mdDialog, Dialogs, $state, GitLog, IS_ELECTRON, $timeout, $scope, AppStorage, GoogleDriveSync, SimpleToast) {
    const IPC_EVENT_SHUTDOWN = 'SHUTDOWN';
    const SUCCESS_ANIMATION_DURATION = 500;
    const SUCCESS_ANIMATION_MAX_DURATION = 10000;

    let successAnimationTimeout;
    let successAnimationMaxTimeout;
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;
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
        if (GoogleDriveSync.config && GoogleDriveSync.config.isAutoSyncToRemote) {
          SimpleToast('CUSTOM', `Syncing Data to Google Drive.`, 'file_upload');
          GoogleDriveSync.saveTo();
        }

        initSuccessAnimation(() => {
          $state.go('daily-planner');
        });
      }
    };

    $scope.$on('$destroy', () => {
      if (successAnimationTimeout) {
        $timeout.cancel(successAnimationTimeout);
      }
      if (successAnimationMaxTimeout) {
        $timeout.cancel(successAnimationMaxTimeout);
      }
    });

    function initSuccessAnimation(cb) {
      vm.showSuccessAnimation = true;
      successAnimationTimeout = $timeout(() => {
        if (cb) {
          cb();
        }
      }, SUCCESS_ANIMATION_DURATION);

      successAnimationMaxTimeout = $timeout(() => {
        vm.showSuccessAnimation = false;
      }, SUCCESS_ANIMATION_MAX_DURATION);

    }
  }

})();
