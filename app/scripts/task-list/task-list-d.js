/**
 * @ngdoc directive
 * @name superProductivity.directive:taskList
 * @description
 * # taskList
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('taskList', taskList);

  /* @ngInject */
  function taskList() {
    return {
      templateUrl: 'scripts/task-list/task-list-d.html',
      bindToController: true,
      controller: TaskListCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        tasks: '='
      }
    };
  }

  /* @ngInject */
  function TaskListCtrl() {
    let vm = this;
  }

})();
