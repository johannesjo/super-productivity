/**
 /**
 * @ngdoc directive
 * @name superProductivity.directive:subTaskList
 * @description
 * # subTaskList
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('subTaskList', subTaskList);

  /* @ngInject */
  function subTaskList() {
    return {
      templateUrl: 'scripts/sub-task-list/sub-task-list-d.html',
      bindToController: true,
      controller: SubTaskListCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        task: '='
      }
    };
  }

  /* @ngInject */
  function SubTaskListCtrl($scope, Tasks) {
    let vm = this;

    $scope.$watch('vm.task.subTasks', (tasks) => {
      if (angular.isArray(tasks)) {
        vm.task.timeEstimate = Tasks.calcTotalEstimate(tasks);
        vm.task.timeSpent = Tasks.calcTotalTimeSpent(tasks);
      }
    }, true);
  }

})();
