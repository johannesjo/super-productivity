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
        tasks: '=',
        currentTask: '=',
        limitTo: '@',
        filter: '=',
        allowTaskSelection: '@',
        disableDropInto: '@'
      }
    };
  }

  /* @ngInject */
  function TaskListCtrl(Dialogs, $rootScope, $window) {
    let vm = this;

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', {task});
    };

    vm.deleteTask = (taskId) => {
      $window._.remove(vm.tasks, {
        id: taskId
      });
    };

    vm.onTaskDoneChanged = (task) => {
      // open task selection if current task is done
      if (task.isDone) {
        if (vm.currentTask && vm.currentTask.id === task.id) {
          Dialogs('TASK_SELECTION')
            .then(() => {
              vm.currentTask = $rootScope.r.currentTask;
            });
        }
      }
    };
  }

})();
