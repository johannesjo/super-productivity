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
  function DailyPlannerCtrl($scope, $rootScope, Tasks, Dialogs, $state, $window) {
    let vm = this;

    vm.limitBacklogTo = 3;

    vm.tasks = $rootScope.r.tasks;
    vm.backlogTasks = $rootScope.r.backlogTasks;
    vm.currentTask = $rootScope.r.currentTask;

    vm.addTask = () => {
      if (vm.newTask) {
        vm.tasks.push({
          title: vm.newTask,
          id: Math.random().toString(36).substr(2, 10)
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
      Dialogs('TASK_SELECTION', {tasks: vm.tasks})
        .then(() => {
          $state.go('work-view');
        });
    };

    $scope.$watch('vm.tasks', (mVal) => {
      if (angular.isArray(mVal) && vm.tasks.length > 0) {
        vm.totaleEstimate = $window.moment.duration();

        for (let i = 0; i < mVal.length; i++) {
          let task = mVal[i];
          vm.totaleEstimate.add(task.timeEstimate);
        }
      }

      Tasks.updateToday(mVal);
    }, true);

    $scope.$watch('vm.backlogTasks', (mVal) => {
      Tasks.updateBacklog(mVal);
    }, true);
  }

})();
