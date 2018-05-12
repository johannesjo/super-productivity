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
      template: require('./done-tasks-backlog-d.html'),
      bindToController: true,
      controller: DoneTasksBacklogCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function DoneTasksBacklogCtrl($scope, TasksUtil, Tasks, EV) {
    let vm = this;

    vm.doneBacklogTasks = Tasks.getDoneBacklog();

    const watcher = $scope.$watch('vm.doneBacklogTasks', (mVal) => {
      vm.totalTimeSpent = TasksUtil.calcTotalTimeSpent(mVal);
    }, true);

    $scope.$on('$destroy', watcher);

    [EV.PROJECT_CHANGED, EV.COMPLETE_DATA_RELOAD].forEach((EV) => {
      $scope.$on(EV, () => {
        vm.doneBacklogTasks = Tasks.getDoneBacklog();
      });
    });

    vm.restoreTask = (task) => {
      Tasks.moveTaskFromDoneBackLogToToday(task);
      vm.doneBacklogTasks = Tasks.getDoneBacklog();
    };
  }
})();
