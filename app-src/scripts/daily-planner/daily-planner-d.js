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
      templateUrl: 'scripts/daily-planner/daily-planner-d.html',
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
    const _ = $window._;

    vm.refreshRemoteTasks = () => {
      vm.taskSuggestions = [];

      if (Jira.isSufficientJiraSettings()) {
        Jira.checkForNewAndAddToBacklog();

        Jira.getSuggestions().then((res) => {
          vm.taskSuggestions = vm.taskSuggestions.concat(Jira.transformIssues(res));
        });
      }

      // add new git tasks
      Git.checkForNewAndAddToBacklog();

      if (Git.isRepoConfigured() && $rootScope.r.git.isShowIssuesFromGit) {
        Git.getIssueList()
          .then((res) => {
            vm.taskSuggestions = vm.taskSuggestions.concat(res.data);
          });
      }
    };

    vm.getFilteredTaskSuggestions = (searchText) => {
      return searchText ? $filter('filter')(vm.taskSuggestions, searchText, false, 'title') : vm.taskSuggestions;
    };

    vm.init = () => {
      vm.limitBacklogTo = 3;
      vm.backlogTasks = Tasks.getBacklog();

      vm.isRemoteTasks = (IS_ELECTRON && Jira.isSufficientJiraSettings() || $rootScope.r.git.isAutoImportToBacklog);
      vm.refreshRemoteTasks();
    };
    vm.init();

    vm.addTask = () => {
      if (vm.newTask) {
        if (vm.newTask.originalType && vm.newTask.originalType === 'GITHUB' && $rootScope.r.git.isShowIssuesFromGit) {
          Git.getCommentListForIssue(vm.newTask.originalId)
            .then(res => {
              vm.newTask.originalComments = res.data;
              Tasks.addToday(vm.newTask);
              vm.newTask = undefined;
              vm.newTaskTitle = undefined;
            });
        } else {
          Tasks.addToday(vm.newTask);
          vm.newTask = undefined;
          vm.newTaskTitle = undefined;
        }

      } else if (vm.newTaskTitle) {
        Tasks.addToday({
          title: vm.newTaskTitle
        });
        vm.newTaskTitle = undefined;
      }

      // if we have already defined enough tasks and the
      // new task field is empty go to work view
      else if ($rootScope.r.tasks.length > 0) {
        vm.done();
      }
    };

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
