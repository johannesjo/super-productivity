/**
 * @ngdoc directive
 * @name superProductivity.directive:workView
 * @description
 * # workView
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('workView', workView);

  /* @ngInject */
  function workView() {
    return {
      templateUrl: 'scripts/work-view/work-view-d.html',
      bindToController: true,
      controller: WorkViewCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {}
    };
  }

  /* @ngInject */
  function WorkViewCtrl(Tasks, $rootScope, $scope, $state, $window) {
    let vm = this;

    vm.tasks = $rootScope.r.tasks;
    vm.backlogTasks = $rootScope.r.backlogTasks;
    vm.currentTask = $rootScope.r.currentTask;

    $scope.$watch('vm.currentTask', (mVal) => {
      if (mVal && mVal.isDone) {
        let undoneTasks = $window._.filter(vm.tasks, (task) => {
          return task && !task.isDone;
        });

        // go to daily planner if there are no undone tasks left
        if (!undoneTasks || undoneTasks.length === 0) {
          $state.go('daily-planner');
        } else {
          vm.currentTask = undoneTasks[0];
        }
      }

      Tasks.updateCurrent(vm.currentTask);

    }, true);

    $scope.$watch('vm.tasks', () => {
      Tasks.updateToday(vm.tasks);
    }, true);
  }

})();
