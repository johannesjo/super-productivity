/**
 * @ngdoc directive
 * @name superProductivity.directive:taskList
 * @description
 * # taskList
 */

(function () {
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
        limitTo: '@',
        filter: '=',
        allowTaskSelection: '@',
        disableDropInto: '@'
      }
    };
  }

  /* @ngInject */
  function TaskListCtrl(Dialogs, $localStorage) {
    let vm = this;

    vm.currentTask = $localStorage.currentTask;

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', { task });
    };

    vm.toggleDone = (task) => {
      task.isDone = !task.isDone;

      // open task selection if current task is done
      if (task.isDone) {
        if (vm.currentTask.id === task.id) {
          Dialogs('TASK_SELECTION', { tasks: vm.tasks })
            .then(() => {
              vm.currentTask = $localStorage.currentTask;
            });
        }
      }
    };
  }

})();
