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
      scope: {}
    };
  }

  /* @ngInject */
  function DailyPlannerCtrl($scope, $rootScope, Tasks, Dialogs, $state) {
    let vm = this;

    vm.limitBacklogTo = 3;

    vm.tasks = $rootScope.r.tasks;
    vm.backlogTasks = $rootScope.r.backlogTasks;
    vm.currentTask = $rootScope.r.currentTask;
    vm.noteForToday = $rootScope.r.noteForToday;

    vm.addTask = () => {
      if (vm.newTask) {
        Tasks.addToday({
          title: vm.newTask
        });
        vm.newTask = '';
      }

      // if we have already defined enough tasks and the
      // new task field is empty go to work view
      else if (vm.tasks.length > 0) {
        vm.done();
      }
    };

    vm.done = () => {
      // only open if there is no current task already selected
      if (!vm.currentTask) {
        Dialogs('TASK_SELECTION', { tasks: vm.tasks })
          .then(() => {
            $state.go('work-view');
          });
      } else {
        $state.go('work-view');
      }
    };

    $scope.$watch('vm.tasks', (mVal) => {
      vm.totaleEstimate = Tasks.calcTotalEstimate(mVal);
      Tasks.updateToday(mVal);
    }, true);

    $scope.$watch('vm.backlogTasks', (mVal) => {
      vm.totaleEstimateBacklog = Tasks.calcTotalEstimate(mVal);
      Tasks.updateBacklog(mVal);
    }, true);
  }

})();
