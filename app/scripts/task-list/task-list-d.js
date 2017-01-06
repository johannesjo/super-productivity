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
        disableDropInto: '@',
        onItemMoved: '&',
        onOrderChanged: '&',
      }
    };
  }

  /* @ngInject */
  function TaskListCtrl(Dialogs, $mdToast, $timeout, $window) {
    let vm = this;

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', { task });
    };

    vm.deleteTask = (task, $index) => {
      // create copy for undo
      let taskCopy = angular.copy(task);
      // delete
      vm.tasks.splice($index, 1);

      // show toast for undo
      let toast = $mdToast.simple()
        .textContent('You deleted "' + task.title + '"')
        .action('UNDO')
        .highlightAction(true)// Accent is used by default, this just demonstrates the usage.
        .position('bottom');
      $mdToast.show(toast).then(function (response) {
        if (response === 'ok') {
          // re-add task on undo
          vm.tasks.splice($index, 0, taskCopy);
        }
      });
    };

    vm.dragControlListeners = {
      accept: () => {
        return !vm.disableDropInto;
      },
      itemMoved: function (event) {
        if (angular.isFunction(vm.onItemMoved)) {
          vm.onItemMoved({ $event: event });
        }
      },
      orderChanged: function (event) {
        if (angular.isFunction(vm.onOrderChanged)) {
          vm.onOrderChanged({ $event: event });
        }
      },
      containment: '#board'
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
          let taskIndex = $window._.findIndex(vm.tasks, (cTask) => {
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
  }

})();
