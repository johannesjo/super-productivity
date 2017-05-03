/**
 * @ngdoc directive
 * @name superProductivity.directive:doneTasksBacklog
 * @description
 * # doneTasksBacklog
 */

(function () {
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
  function DoneTasksBacklogCtrl($scope, TasksUtil, Tasks) {
    let vm = this;

    vm.doneBacklogTasks = Tasks.getDoneBacklog();

    const watcher = $scope.$watch('r.doneBacklogTasks', (mVal) => {
      vm.totalTimeSpent = TasksUtil.calcTotalTimeSpent(mVal);
    }, true);

    $scope.$on('$destroy', watcher);
  }

})();
