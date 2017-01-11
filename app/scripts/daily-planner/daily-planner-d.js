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
  function DailyPlannerCtrl($rootScope, Tasks, Dialogs, $state, Jira, $filter) {
    let vm = this;

    vm.limitBacklogTo = 3;
    vm.taskSuggestions = [];

    vm.getFilteredTaskSuggestions = (searchText) => {
      return searchText ? $filter('filter')(vm.taskSuggestions, searchText, false, 'title') : vm.taskSuggestions;
    };

    Jira.getSuggestions().then((res) => {
      vm.taskSuggestions = Jira.transformIssues(res) || [];
    })
      .catch();

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
      else if ($rootScope.tasks.length > 0) {
        vm.done();
      }
    };

    vm.done = () => {
      // only open if there is no current task already selected
      if (!vm.currentTask) {
        Dialogs('TASK_SELECTION', { tasks: $rootScope.r.tasks })
          .then(() => {
            $state.go('work-view');
          });
      } else {
        $state.go('work-view');
      }
    };

    $rootScope.$watch('r.tasks', (mVal) => {
      vm.totaleEstimate = Tasks.calcTotalEstimate(mVal);
      Tasks.updateToday(mVal);
    }, true);

    $rootScope.$watch('r.backlogTasks', (mVal) => {
      vm.totaleEstimateBacklog = Tasks.calcTotalEstimate(mVal);
      Tasks.updateBacklog(mVal);
    }, true);
  }

})();
