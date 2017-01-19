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
        isTasksForToday: '@',
        isSubTasksDisabled: '@',
        allowTaskSelection: '@',
        disableDropInto: '@',
        onItemMoved: '&',
        onOrderChanged: '&',
        parentTask: '='
      }
    };
  }

  /* @ngInject */
  function TaskListCtrl(Dialogs, $mdToast, $timeout, $window, Tasks, EDIT_ON_CLICK_TOGGLE_EV, $scope, ShortSyntax, $element, Jira) {
    let vm = this;

    let lastFocusedTaskEl;

    // only allow after short delay
    let animationReadyTimeout = $timeout(() => {
      $element.addClass('is-animation-ready');
    }, 300);

    $scope.$on('$destroy', () => {
      $timeout.cancel(animationReadyTimeout);
    });

    function focusPreviousInListOrParent($index) {
      let taskEls = angular.element($element.children().children());
      let focusTaskEl;

      // NOTE!!! element has not yet been removed from the dom
      if (taskEls.length > 1) {
        // if is last
        if (taskEls.length === $index + 1) {
          focusTaskEl = angular.element(taskEls[$index - 1]);
        } else {
          focusTaskEl = angular.element(taskEls[$index + 1]);
        }
      } else if (vm.parentTask) {
        focusTaskEl = angular.element($element.parent()).parent();
      }

      if (focusTaskEl) {
        focusTaskEl.focus();
      }
    }

    vm.focusLastFocusedTaskEl = () => {
      if (lastFocusedTaskEl) {
        lastFocusedTaskEl.focus();
      }
    };

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', { task, isTasksForToday: vm.isTasksForToday })
        .finally(vm.focusLastFocusedTaskEl);
    };

    vm.deleteTask = (task, $index) => {
      // create copy for undo
      let taskCopy = angular.copy(task);
      // delete
      vm.tasks.splice($index, 1);
      focusPreviousInListOrParent($index);

      // show toast for undo
      let toast = $mdToast.simple()
        .textContent('You deleted "' + task.title + '"')
        .action('UNDO')
        .position('bottom');
      $mdToast.show(toast).then(function (response) {
        if (response === 'ok') {
          // re-add task on undo
          vm.tasks.splice($index, 0, taskCopy);
        }
      });
    };

    vm.dragControlListeners = {
      accept: (sourceItemHandleScope, destSortableScope) => {
        if (vm.disableDropInto) {
          return false;
        } else {
          // disallow parent tasks to be dropped into parent tasks
          let draggedTask = sourceItemHandleScope.itemScope.task;
          return !(draggedTask.subTasks && draggedTask.subTasks.length > 0 && destSortableScope.$parent.vm.parentTask);

          // check for dupes
          //let draggedTask = sourceItemHandleScope.itemScope.task;
          //let targetTasks = destSortableScope.modelValue;
          //let possibleDuplicates = $window._.find(targetTasks, (task) => {
          //  return task.id == draggedTask.id;
          //});
          //
          //return !possibleDuplicates || possibleDuplicates.length === 0;
        }
      },
      itemMoved: function (event) {
        let currentTask = event.dest.sortableScope.modelValue[event.dest.index];
        let parentTask = event.dest.sortableScope.$parent.vm.parentTask;
        if (parentTask) {
          currentTask.parentId = parentTask.id;
        } else {
          if (!angular.isUndefined(currentTask.parentId)) {
            delete currentTask.parentId;
          }
        }

        if (angular.isFunction(vm.onItemMoved)) {
          vm.onItemMoved({ $event: event });
        }
      },
      orderChanged: function (event) {
        if (angular.isFunction(vm.onOrderChanged)) {
          vm.onOrderChanged({ $event: event });
        }
      },
      allowDuplicates: false,
      containment: '#board'
    };

    vm.onChangeTitle = (task) => {
      ShortSyntax(task);
    };

    vm.onTaskNotesChanged = (task) => {
      if (task.originalKey) {
        Jira.updateIssueDescription(task);
      }
    };

    vm.onTaskDone = (task) => {
      if (task.isDone) {
        Jira.addWorklog(task);
      }
    };

    vm.handleKeyPress = ($event, task, $index) => {
      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
      lastFocusedTaskEl = taskEl;

      // escape
      if ($event.keyCode === 27) {
        task.showNotes = false;
        taskEl.focus();
        // don't propagate to parent task element
        $event.preventDefault();
        $event.stopPropagation();
      }

      // only trigger if target is li
      if ($event.target.tagName !== 'INPUT' && $event.target.tagName !== 'TEXTAREA') {
        const USED_KEYS = [
          84,
          78,
          68,
          46,
          13,
          187,
          65
        ];
        if (USED_KEYS.indexOf($event.keyCode) > -1) {
          // don't propagate to parent task element
          $event.preventDefault();
          $event.stopPropagation();
        }

        // + or a
        if ($event.keyCode === 187 || $event.keyCode === 65) {
          vm.addSubTask(task);
        }
        // t
        if ($event.keyCode === 84) {
          vm.estimateTime(task);
        }
        // n
        if ($event.keyCode === 78) {
          task.showNotes = !task.showNotes;
        }
        // d
        if ($event.keyCode === 68) {
          task.isDone = !task.isDone;
        }
        // entf
        if ($event.keyCode === 46) {
          vm.deleteTask(task, $index);
        }
        // enter
        if ($event.keyCode === 13) {
          $scope.$broadcast(EDIT_ON_CLICK_TOGGLE_EV, task.id);
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

              // don't propagate to parent task element
              $event.preventDefault();
              $event.stopPropagation();
            }
          }
          // move down
          if ($event.keyCode === 40) {
            if (taskIndex < vm.tasks.length - 1) {
              vm.moveItem(vm.tasks, taskIndex, taskIndex + 1);
            }
            // don't propagate to parent task element
            $event.preventDefault();
            $event.stopPropagation();
          }
        }
      }
    };

    vm.addSubTask = (task) => {
      // use parent task if the current task is a sub task itself
      if (vm.parentTask) {
        task = vm.parentTask;
      }

      // only allow if task is not done
      if (!task.isDone) {
        if (!task.subTasks) {
          task.subTasks = [];
          // save original values for potential later re-initialization
          task.mainTaskTimeEstimate = task.timeEstimate;
          task.mainTaskTimeSpent = task.timeSpent;
        }
        let subTask = Tasks.createTask({
          title: '',
          parentId: task.id
        });
        // edit title right away
        task.subTasks.push(subTask);

        // focus the new element to edit it right away
        // timeout is needed to wait for dom to update
        $timeout(() => {
          $scope.$broadcast(EDIT_ON_CLICK_TOGGLE_EV, subTask.id);
        });

        // if parent was current task, mark sub task as current now
        if (vm.currentTask && vm.currentTask.id && vm.currentTask.id === task.id) {
          vm.currentTask = subTask;
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
