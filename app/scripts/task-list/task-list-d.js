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
      Dialogs('TIME_ESTIMATE', { task });
    };

    vm.deleteTask = (taskId) => {
      $window._.remove(vm.tasks, {
        id: taskId
      });
    };

    vm.dragControlListeners = {
      accept: () => {
        return !vm.disableDropInto;
      }
    };

    vm.handleKeyPress = ($event, task) => {
      //console.log(task.title, $event);
      //console.log($event.keyCode);

      if ($event.keyCode) {
        // t
        if ($event.keyCode === 84) {
          vm.estimateTime(task);
        }
        // n
        if ($event.keyCode === 78) {
          task.showNotes = true;
        }
        // d
        if ($event.keyCode === 68) {
          task.isDone = !task.isDone;
        }
        // entf
        if ($event.keyCode === 46) {
          vm.deleteTask(task.id);
        }
        // enter
        if ($event.keyCode === 13) {
          task.showEdit = true;
        }
        // escape
        if ($event.keyCode === 27) {
          task.showEdit = false;
          task.showNotes = false;
        }
      }
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
