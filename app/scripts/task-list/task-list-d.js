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
  function TaskListCtrl(Dialogs, $rootScope, $window, $mdDialog, $timeout) {
    let vm = this;

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', { task });
    };

    vm.deleteTask = (taskId) => {
      $mdDialog.show(
        $mdDialog.confirm()
          .title('Do you really want to delete this task?')
          .ariaLabel('Delete Task')
          .ok('Please do it!')
          .cancel('Better not!')
      ).then(function () {
        $window._.remove(vm.tasks, {
          id: taskId
        });
      });
    };

    vm.dragControlListeners = {
      accept: () => {
        return !vm.disableDropInto;
      }
    };

    vm.handleKeyPress = ($event, task) => {
      // only trigger if target is li

      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;

      // escape
      if ($event.keyCode === 27) {
        task.showEdit = false;
        task.showNotes = false;

        taskEl.focus();
      }

      if ($event.target.tagName !== 'INPUT' && $event.target.tagName !== 'TEXTAREA') {
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
          task.showEdit = [true];
        }

        // moving items via shift+ctrl+keyUp/keyDown
        if ($event.shiftKey === true && $event.ctrlKey === true) {
          let taskIndex = _.findIndex(vm.tasks, (cTask) => {
            return cTask.id === task.id;
          });

          // move up
          if ($event.keyCode === 38) {
            if (taskIndex > 0) {
              vm.moveItem(vm.tasks, taskIndex, taskIndex - 1);
              // we need to manually re-add focus after timeout
              $timeout(() => {
                taskEl.focus();
              });
            }

          }
          // move down
          if ($event.keyCode === 40) {
            if (taskIndex < vm.tasks.length - 1) {
              vm.moveItem(vm.tasks, taskIndex, taskIndex + 1);
            }
          }
        }
      }
    };

    vm.moveItem = (array, oldIndex, newIndex) => {
      if (newIndex >= array.length) {
        let k = newIndex - array.length;
        while ((k--) + 1) {
          array.push(undefined);
        }
      }
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
      return array; // for testing purposes
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
