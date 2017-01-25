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
    .component('taskList', {
      templateUrl: 'scripts/task-list/task-list-d.html',
      bindToController: true,
      controller: TaskListCtrl,
      controllerAs: 'vm',
      bindings: {
        tasks: '=',
        currentTaskId: '<',
        limitTo: '@',
        filter: '<',
        isSubTasksDisabled: '@',
        allowTaskSelection: '@',
        disableDropInto: '@',
        onItemMoved: '&',
        onOrderChanged: '&',
        onTaskDoneChangedCallback: '&onTaskDoneChanged',
        parentTask: '='
      }
    });

  /* @ngInject */
  function TaskListCtrl(Dialogs, $mdToast, $timeout, $window, Tasks, EDIT_ON_CLICK_TOGGLE_EV, $scope, ShortSyntax, $element, Jira) {
    let vm = this;
    const _ = $window._;

    let lastFocusedTaskEl;

    // only allow after short delay
    let animationReadyTimeout = $timeout(() => {
      $element.addClass('is-animation-ready');
    }, 400);

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
      Dialogs('TIME_ESTIMATE', { task })
        .finally(vm.focusLastFocusedTaskEl);
    };

    vm.deleteTask = (task, $index) => {
      // create copy for undo
      let taskCopy = angular.copy(task);

      if (!$index && $index !== 0) {
        $index = _.findIndex(vm.tasks, (taskFromAllTasks) => {
          return taskFromAllTasks.id === task.id;
        });
      }

      //delete
      vm.tasks.splice($index, 1);
      focusPreviousInListOrParent($index);

      // show toast for undo
      let toast = $mdToast.simple()
        .textContent('You deleted "' + task.title + '"')
        .action('UNDO')
        .hideDelay(15000)
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
        let currentlyMovedTask = event.dest.sortableScope.modelValue[event.dest.index];
        let parentTask = event.dest.sortableScope.$parent.vm.parentTask;
        if (parentTask) {
          currentlyMovedTask.parentId = parentTask.id;
        } else {
          if (!angular.isUndefined(currentlyMovedTask.parentId)) {
            delete currentlyMovedTask.parentId;
          }
        }

        if (angular.isFunction(vm.onItemMoved)) {
          vm.onItemMoved({
            currentlyMovedTask,
            parentTask,
            $event: event
          });
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

    vm.onChangeTitle = (task, isChanged, newVal) => {
      if (isChanged && newVal) {
        // we need to do this, as the pointer might not have been updated yet
        task.title = newVal;
        ShortSyntax(task);
      }
    };

    vm.onTaskNotesChanged = (task) => {
      if (task.originalKey) {
        Jira.updateIssueDescription(task);
      }
    };

    vm.onTaskDoneChanged = (task) => {
      if (task.isDone) {
        task.doneDate = $window.moment();
        Jira.addWorklog(task);
      }

      if (angular.isFunction(vm.onTaskDoneChangedCallback)) {
        vm.onTaskDoneChangedCallback({ task, taskList: vm.tasks });
      }
    };

    vm.onFocus = ($event) => {
      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
      taskEl = angular.element(taskEl);
      lastFocusedTaskEl = taskEl;
      taskEl.on('keydown', handleKeyPress);
    };

    vm.onBlur = ($event) => {
      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
      taskEl = angular.element(taskEl);
      taskEl.off('keydown', handleKeyPress);
    };

    function handleKeyPress($event) {
      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
      taskEl = angular.element(taskEl);
      const task = lastFocusedTaskEl.scope().modelValue;

      // escape
      //if ($event.keyCode === 27) {
      //  task.showNotes = false;
      //  taskEl.focus();
      //}

      // only trigger if target is li
      const USED_KEYS = [
        '+',
        'a',
        't',
        'n',
        'd'
      ];
      const USED_KEY_CODES = [
        46,
        13
      ];

      if (USED_KEY_CODES.indexOf($event.keyCode) > -1 || USED_KEYS.indexOf($event.key) > -1) {
        // + or a
        if ($event.key === '+' || $event.key === 'a') {
          vm.addSubTask(task);
        }
        // t
        if ($event.key === 't') {
          vm.estimateTime(task);
        }
        // n
        if ($event.key === 'n') {
          task.showNotes = !task.showNotes;
        }
        // d
        if ($event.key === 'd') {
          task.isDone = !task.isDone;
        }
        // entf
        if ($event.keyCode === 46) {
          vm.deleteTask(task);
          // don't propagate to next focused element
          $event.preventDefault();
          $event.stopPropagation();
        }
        // enter
        if ($event.keyCode === 13) {
          $scope.$broadcast(EDIT_ON_CLICK_TOGGLE_EV, task.id);
        }
        $scope.$apply();
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
            $scope.$apply();

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
            $scope.$apply();
          }
        }
      }
    }

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
          task.mainTaskTimeSpentOnDay = task.timeSpentOnDay;
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
        if (vm.currentTaskId === task.id) {
          Tasks.updateCurrent(subTask);
        }
      }
    };

    vm.togglePlay = (task) => {
      if (vm.currentTaskId === task.id) {
        Tasks.updateCurrent(undefined);
      } else {
        Tasks.updateCurrent(task);
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
