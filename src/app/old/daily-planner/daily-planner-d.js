/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyPlanner
 * @description
 * # dailyPlanner
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('dailyPlanner', dailyPlanner);

  /* @ngInject */
  function dailyPlanner() {
    return {
      template: require('./daily-planner-d.html'),
      bindToController: true,
      controller: DailyPlannerCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function DailyPlannerCtrl(IS_ELECTRON, $rootScope, $window, $scope, Tasks, TasksUtil, Dialogs, $state, Jira, $filter, Git, $mdDialog, EV, $interval) {
    let vm = this;

    vm.init = () => {
      vm.limitBacklogTo = 3;
      vm.backlogTasks = Tasks.getBacklog();

      vm.isRemoteTasks = (IS_ELECTRON && Jira.isSufficientJiraSettings() || $rootScope.r.git.isAutoImportToBacklog);
    };
    vm.init();

    vm.done = () => {
      // only open if there is no current task already selected
      if (!vm.currentTask) {
        Dialogs('TASK_SELECTION')
          .then(() => {
            $state.go('work-view');
          });
      } else {
        $state.go('work-view');
      }
    };

    vm.onEmptySubmit = () => {
      // if we have already defined enough tasks and the
      // new task field is empty go to work view
      if ($rootScope.r.tasks.length > 0) {
        this.done();
      }
    };

    vm.deleteBacklog = () => {
      const confirm = $mdDialog.confirm()
        .title('Would you like to delete all backlog tasks?')
        .textContent('All tasks will be deleted locally. Remote tasks can be re-imported but local tasks will be lost forever.')
        .ariaLabel('Delete Backlog')
        .ok('Please do it!')
        .cancel('Better not');

      $mdDialog.show(confirm).then(function() {
        Tasks.clearBacklog();
        vm.backlogTasks = Tasks.getBacklog();
      });
    };

    // WATCHER & EVENTS
    // ----------------
    // its much more efficient to do this in an interval rather than listening to actual data changes, so we just do it this way
    const updateTimeTotalsInterval = $interval(() => {
      vm.totaleEstimate = TasksUtil.calcTotalEstimate($rootScope.r.tasks);
      vm.totaleEstimateBacklog = TasksUtil.calcTotalEstimate($rootScope.r.backlogTasks);
    }, 500);

    // otherwise we update on view change
    $scope.$on('$destroy', () => {
      if (updateTimeTotalsInterval) {
        $interval.cancel(updateTimeTotalsInterval);
      }
    });

    [EV.PROJECT_CHANGED, EV.COMPLETE_DATA_RELOAD].forEach((EV) => {
      $scope.$on(EV, () => {
        vm.init();
      });
    });
  }
})();
