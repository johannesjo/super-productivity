/**
 * @ngdoc directive
 * @name superProductivity.directive:doneTasksBacklog
 * @description
 * # doneTasksBacklog
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('doneTasksBacklog', doneTasksBacklog);

  /* @ngInject */
  function doneTasksBacklog() {
    return {
      templateUrl: 'scripts/done-tasks-backlog/done-tasks-backlog-d.html',
      bindToController: true,
      controller: DoneTasksBacklogCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function DoneTasksBacklogCtrl($scope, TasksUtil, Tasks, EV_PROJECT_CHANGED) {
    let vm = this;

    vm.doneBacklogTasks = Tasks.getDoneBacklog();

    const watcher = $scope.$watch('vm.doneBacklogTasks', (mVal) => {
      vm.totalTimeSpent = TasksUtil.calcTotalTimeSpent(mVal);
    }, true);

    $scope.$on('$destroy', watcher);

    $scope.$on(EV_PROJECT_CHANGED, () => {
      vm.doneBacklogTasks = Tasks.getDoneBacklog();
    });

    vm.restoreTask = (task) => {
      Tasks.moveTaskFromDoneBackLogToToday(task);
    };
  }
})();
