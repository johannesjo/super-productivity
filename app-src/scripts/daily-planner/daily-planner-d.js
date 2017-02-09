/**
 * @ngdoc directive
 * @name superProductivity.directive:dailyPlanner
 * @description
 * # dailyPlanner
 */

(function () {
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
  function DailyPlannerCtrl($localStorage, $window, $scope, Tasks, TasksUtil, Dialogs, $state, Jira, $filter, IS_ELECTRON) {
    let vm = this;
    const _ = $window._;

    vm.limitBacklogTo = 3;
    vm.taskSuggestions = [];

    vm.getFilteredTaskSuggestions = (searchText) => {
      return searchText ? $filter('filter')(vm.taskSuggestions, searchText, false, 'title') : vm.taskSuggestions;
    };

    if (IS_ELECTRON && Jira.isSufficientJiraSettings()) {
      Jira.getSuggestions().then((res) => {
        vm.taskSuggestions = Jira.transformIssues(res) || [];
      });
    }

    vm.addTask = () => {
      if (vm.newTask) {
        Tasks.addToday(vm.newTask);
        vm.newTask = undefined;
        vm.newTaskTitle = undefined;
      } else if (vm.newTaskTitle) {
        Tasks.addToday({
          title: vm.newTaskTitle
        });
        vm.newTaskTitle = undefined;
      }

      // if we have already defined enough tasks and the
      // new task field is empty go to work view
      else if ($localStorage.tasks.length > 0) {
        vm.done();
      }
    };

    vm.done = () => {
      // only open if there is no current task already selected
      if (!vm.currentTask) {
        Dialogs('TASK_SELECTION', { tasks: $localStorage.tasks })
          .then(() => {
            $state.go('work-view');
          });
      } else {
        $state.go('work-view');
      }
    };

    // WATCHER & EVENTS
    // ----------------
    const watchers = [];
    watchers.push($scope.$watch('r.tasks', (mVal) => {
      vm.totaleEstimate = TasksUtil.calcTotalEstimate(mVal);
    }, true));

    watchers.push($scope.$watch('r.backlogTasks', (mVal) => {
      vm.totaleEstimateBacklog = TasksUtil.calcTotalEstimate(mVal);
    }, true));

    // otherwise we update on view change
    $scope.$on('$destroy', () => {
      // remove watchers manually
      _.each(watchers, (watcher) => {
        watcher();
      });
    });
  }

})();
