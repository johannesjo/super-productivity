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
      scope: {}
    };
  }

  /* @ngInject */
  function DoneTasksBacklogCtrl($rootScope, $scope, TasksUtil) {
    let vm = this;
    vm.r = $rootScope.r;

    $scope.$watch('vm.r.doneBacklogTasks', (mVal) => {
      vm.totalTimeSpent = TasksUtil.calcTotalTimeSpent(mVal);
    }, true);
  }

})();
