/**
 * @ngdoc component
 * @name superProductivity.directive:taskList
 * @description
 * # taskList
 */

(function() {
  'use strict';

  const CONTROLLER_AS = '$ctrl';
  const KEY_LEFT = 37;
  const KEY_UP = 38;
  const KEY_RIGHT = 39;
  const KEY_DOWN = 40;

  function isTargetAnInput(target) {
    if (target) {
      const isContentEditable = !!target.getAttribute('contenteditable');
      const isInput = (target.tagName === 'INPUT') || (target.tagName === 'TEXTAREA');
      return isContentEditable || isInput;
    }

    return false;
  }

  class TaskListCtrl {
    /* @ngInject */
    constructor(Dialogs, $rootScope, $mdToast, $timeout, Tasks, EDIT_ON_CLICK_TOGGLE_EV, $scope, ShortSyntax, $element, Jira, CheckShortcutKeyCombo, Util) {
      this.Dialogs = Dialogs;
      this.$mdToast = $mdToast;
      this.$timeout = $timeout;
      this.Tasks = Tasks;
      this.EDIT_ON_CLICK_TOGGLE_EV = EDIT_ON_CLICK_TOGGLE_EV;
      this.$scope = $scope;
      this.ShortSyntax = ShortSyntax;
      this.$element = $element;
      this.Jira = Jira;
      this.$rootScope = $rootScope;
      this.lastFocusedTaskEl = undefined;
      this.checkKeyCombo = CheckShortcutKeyCombo;
      this.Util = Util;
      // this.selectCurrentTaskTimeout;

      this.boundHandleKeyDown = this.handleKeyDown.bind(this);
      this.boundFocusLastTaskEl = this.focusLastFocusedTaskEl.bind(this);
      this.$element[0].addEventListener('keydown', this.boundHandleKeyDown);
    }

    $onDestroy() {
      this.$timeout.cancel(this.animationReadyTimeout);
      this.$timeout.cancel(this.selectCurrentTaskTimeout);
      this.$element[0].removeEventListener('keydown', this.boundHandleKeyDown);
    }

    $onInit() {
      // only allow after short delay
      this.animationReadyTimeout = this.$timeout(() => {
        this.$element.addClass('is-animation-ready');
      }, 400);

      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // NOTE: Take good care not to update the dom (scope) structure
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      function getParenTaskFromDestScope(destSortableScope) {
        return destSortableScope.$parent[CONTROLLER_AS].parentTask;
      }

      this.dragControlListeners = {
        accept: (sourceItemHandleScope, destSortableScope) => {
          if (this.disableDropInto) {
            return false;
          } else {
            // disallow parent tasks to be dropped into parent tasks
            let draggedTask = sourceItemHandleScope.itemScope.task;
            return !(draggedTask.subTasks && draggedTask.subTasks.length > 0 && getParenTaskFromDestScope(destSortableScope));
          }
        },
        itemMoved: function(event) {
          let currentlyMovedTask = event.dest.sortableScope.modelValue[event.dest.index];
          let parentTask = getParenTaskFromDestScope(event.dest.sortableScope);

          if (parentTask) {
            currentlyMovedTask.parentId = parentTask.id;
          } else {
            if (!angular.isUndefined(currentlyMovedTask.parentId)) {
              delete currentlyMovedTask.parentId;
            }
          }

          if (angular.isFunction(this.onItemMoved)) {
            this.onItemMoved({
              currentlyMovedTask,
              parentTask,
              $event: event
            });
          }
        },
        orderChanged: function(event) {
          if (angular.isFunction(this.onOrderChanged)) {
            this.onOrderChanged({ $event: event });
          }
        },
        allowDuplicates: false,
        containment: '#board'
      };
    }

    focusPreviousInListOrParent($index) {
      let taskEls = angular.element(this.$element.children().children());
      let focusTaskEl;

      // NOTE!!! element has not yet been removed from the dom
      if (taskEls.length > 1) {
        // if is last
        if (taskEls.length === $index + 1) {
          focusTaskEl = angular.element(taskEls[$index - 1]);
        } else {
          focusTaskEl = angular.element(taskEls[$index + 1]);
        }
      } else if (this.parentTask) {
        focusTaskEl = angular.element(this.$element.parent()).parent();
      }

      if (focusTaskEl) {
        focusTaskEl.focus();
      }
    }

    focusTaskEl(taskEl, ev) {
      if (ev && isTargetAnInput(ev.relatedTarget)) {
        return;
      }

      if (taskEl) {
        taskEl.focus();
      }
    }

    focusLastFocusedTaskEl() {
      if (this.lastFocusedTaskEl) {
        this.focusTaskEl(this.lastFocusedTaskEl);
      }
    }

    focusCurrentTask() {
      if (this.selectCurrentTaskTimeout) {
        this.$timeout.cancel(this.selectCurrentTaskTimeout);
      }

      this.selectCurrentTaskTimeout = this.$timeout(() => {
        const currentTask = document.querySelectorAll('.task.is-current');
        if (currentTask && currentTask[0]) {
          currentTask[0].focus();
        }
      });
    }

    estimateTime(task) {
      this.Dialogs('TIME_ESTIMATE', { task })
        .then(this.boundFocusLastTaskEl, this.boundFocusLastTaskEl);
    }

    deleteTask(task, $index) {
      const that = this;
      // create copy for undo
      let taskCopy = angular.copy(task);

      if (!$index && $index !== 0) {
        $index = _.findIndex(this.tasks, (taskFromAllTasks) => {
          return taskFromAllTasks.id === task.id;
        });
      }

      //delete
      this.tasks.splice($index, 1);
      this.focusPreviousInListOrParent($index);

      // check if current task was deleted and unset current task if so
      if (this.$rootScope.r.currentTask && this.$rootScope.r.currentTask.id === task.id) {
        this.Tasks.updateCurrent(undefined);
      }

      // show toast for undo
      this.$mdToast.show({
        hideDelay: 20000,
        controller:
        /* @ngInject */
          ($scope, $mdToast) => {
            $scope.undo = () => {
              $mdToast.hide('UNDO');
            };
          },
        template: `
<md-toast>
  <div class="md-toast-content">
    <div class="icon-wrapper">
      <ng-md-icon icon="delete_forever"
                  style="fill:#e11826"></ng-md-icon>
    </div>

    <div class="toast-text">You deleted "${task.title}"</div>
    <md-button class=""
               ng-click="undo()">
      <ng-md-icon icon="undo"></ng-md-icon>
      UNDO</md-button>
  </div>
</md-toast>`
      })
        .then(function(response) {
          if (response === 'UNDO') {
            // re-add task on undo
            that.tasks.splice($index, 0, taskCopy);
          }
        })
        // we need an empty catch to prevent the unhandled rejection error
        .catch(() => {
        });
    }

    onChangeTitle(task, isChanged, newVal) {
      if (isChanged && newVal) {
        // we need to do this, as the pointer might not have been updated yet
        task.title = newVal;
        this.ShortSyntax(task);
      }
    }

    onTaskNotesEditFinished(newNoteVal, isChanged, task) {
      if (task.originalKey && isChanged) {
        // for some reason, this isn't updated for the task, so we do it here once more
        task.notes = newNoteVal;
        this.Jira.updateIssueDescription(task);
      }

      this.focusLastFocusedTaskEl();
    }

    onTaskDoneChanged(task) {
      if (task.isDone) {
        this.Tasks.markAsDone(task);
      }

      if (angular.isFunction(this.onTaskDoneChangedCallback)) {
        this.onTaskDoneChangedCallback({ task, taskList: this.tasks });
      }
    }

    focusPrevTask(currentTaskEl) {
      const taskEls = document.querySelectorAll('.task');
      const index = Array.prototype.indexOf.call(taskEls, currentTaskEl[0]);
      const nextEl = taskEls[index - 1] || taskEls[0];
      nextEl.focus();
    }

    focusNextTask(currentTaskEl) {
      const taskEls = document.querySelectorAll('.task');
      const index = Array.prototype.indexOf.call(taskEls, currentTaskEl[0]);
      const nextEl = taskEls[index + 1] || currentTaskEl[0];
      nextEl.focus();
    }

    onFocus($event) {
      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
      taskEl = angular.element(taskEl);
      this.lastFocusedTaskEl = taskEl;
    }

    handleKeyDown($ev) {
      // TODO check for closest parent if not task el
      let taskEl = $ev.srcElement;
      taskEl = angular.element(taskEl);

      let isTaskKeyboardShortcutTriggered = false;
      const task = taskEl.scope().modelValue;
      const lsKeys = this.$rootScope.r.keys;
      const isShiftOrCtrlPressed = ($ev.shiftKey === false && $ev.ctrlKey === false);
      const getTaskIndex = () => {
        return _.findIndex(this.tasks, (cTask) => {
          return cTask.id === task.id;
        });
      };

      if (this.checkKeyCombo($ev, lsKeys.taskEditTitle) || $ev.key === 'Enter') {
        isTaskKeyboardShortcutTriggered = true;
        this.$scope.$broadcast(this.EDIT_ON_CLICK_TOGGLE_EV, task.id);
      }
      if (this.checkKeyCombo($ev, lsKeys.taskToggleNotes)) {
        isTaskKeyboardShortcutTriggered = true;
        task.showNotes = !task.showNotes;
        if (task.showNotes) {
          this.$timeout(() => {
            taskEl.find('marked-preview').focus();
          });
        }
      }
      if (this.checkKeyCombo($ev, lsKeys.taskOpenEstimationDialog)) {
        isTaskKeyboardShortcutTriggered = true;
        this.estimateTime(task);
      }
      if (this.checkKeyCombo($ev, lsKeys.taskToggleDone)) {
        isTaskKeyboardShortcutTriggered = true;
        task.isDone = !task.isDone;
        this.onTaskDoneChanged(task);
      }
      if (this.checkKeyCombo($ev, lsKeys.taskAddSubTask)) {
        // allow for same keyboard shortcut with the global add task
        isTaskKeyboardShortcutTriggered = true;
        this.addSubTask(task);
      }
      if (this.checkKeyCombo($ev, lsKeys.moveToBacklog)) {
        isTaskKeyboardShortcutTriggered = true;
        this.Tasks.moveTaskFromTodayToBackLog(task);
      }
      if (this.checkKeyCombo($ev, lsKeys.taskOpenOriginalLink)) {
        isTaskKeyboardShortcutTriggered = true;
        this.Util.openExternalUrl(task.originalLink);
      }

      if (this.checkKeyCombo($ev, lsKeys.togglePlay)) {
        isTaskKeyboardShortcutTriggered = true;
        this.expandSubTasks(task);
        this.togglePlay(task);
      }

      if (this.checkKeyCombo($ev, lsKeys.taskDelete)) {
        isTaskKeyboardShortcutTriggered = true;
        this.deleteTask(task);
      }
      if (this.checkKeyCombo($ev, lsKeys.moveToTodaysTasks)) {
        isTaskKeyboardShortcutTriggered = true;
        this.Tasks.moveTaskFromBackLogToToday(task);
      }

      // move focus up
      if ((isShiftOrCtrlPressed && $ev.keyCode === KEY_UP) || this.checkKeyCombo($ev, lsKeys.selectPreviousTask)) {
        isTaskKeyboardShortcutTriggered = true;
        this.focusPrevTask(taskEl);
      }
      // move focus down
      if ((isShiftOrCtrlPressed && $ev.keyCode === KEY_DOWN) || this.checkKeyCombo($ev, lsKeys.selectNextTask)) {
        isTaskKeyboardShortcutTriggered = true;
        this.focusNextTask(taskEl);
      }

      // expand sub tasks
      if (($ev.keyCode === KEY_RIGHT) || this.checkKeyCombo($ev, lsKeys.expandSubTasks)) {
        isTaskKeyboardShortcutTriggered = true;
        // if already opened or is sub task select next task
        if ((task.subTasks && task.subTasks.length > 0 && task.isHideSubTasks === false) || this.parentTask) {
          this.focusNextTask(taskEl);
        }

        this.expandSubTasks(task);
      }

      // collapse sub tasks
      if (($ev.keyCode === KEY_LEFT) || this.checkKeyCombo($ev, lsKeys.collapseSubTasks)) {
        isTaskKeyboardShortcutTriggered = true;
        if (task.subTasks && task.subTasks.length > 0) {
          this.collapseSubTasks(task);
        }
        if (this.parentTask) {
          this.focusPrevTask(taskEl);
        }
      }

      // moving items
      // move task up
      if (this.checkKeyCombo($ev, lsKeys.moveTaskUp)) {
        isTaskKeyboardShortcutTriggered = true;
        const taskIndex = getTaskIndex();
        if (taskIndex > 0) {
          TaskListCtrl.moveItem(this.tasks, taskIndex, taskIndex - 1);

          // we need to manually re-add focus after timeout
          this.$timeout(() => {
            taskEl.focus();
          });
        }
      }
      // move task down
      if (this.checkKeyCombo($ev, lsKeys.moveTaskDown)) {
        isTaskKeyboardShortcutTriggered = true;
        const taskIndex = getTaskIndex();
        if (taskIndex < this.tasks.length - 1) {
          TaskListCtrl.moveItem(this.tasks, taskIndex, taskIndex + 1);
        }
      }

      if (isTaskKeyboardShortcutTriggered) {
        $ev.preventDefault();
        $ev.stopPropagation();

        // finally apply
        this.$scope.$apply();
      }
    }

    expandSubTasks(task) {
      if (task.subTasks && task.subTasks.length > 0) {
        task.isHideSubTasks = false;
      }
    }

    collapseSubTasks(task) {
      if (task.subTasks && task.subTasks.length > 0) {
        const hasCurrentTaskAsSubTask = !!(task.subTasks.find((task) => this.currentTaskId === task.id));

        if (!hasCurrentTaskAsSubTask) {
          task.isHideSubTasks = true;
        }
      }
    }

    addSubTask(task) {
      // use parent task if the current task is a sub task itself
      if (this.parentTask) {
        task = this.parentTask;
      }
      this.expandSubTasks(task);

      // only allow if task is not done
      if (!task.isDone) {
        if (!task.subTasks) {
          task.subTasks = [];
          // save original values for potential later re-initialization
          task.mainTaskTimeEstimate = task.timeEstimate;
          task.mainTaskTimeSpent = task.timeSpent;
          task.mainTaskTimeSpentOnDay = task.timeSpentOnDay;
        }
        let subTask = this.Tasks.createTask({
          title: '',
          parentId: task.id
        });
        // edit title right away
        task.subTasks.push(subTask);

        // focus the new element to edit it right away
        // timeout is needed to wait for dom to update
        this.$timeout(() => {
          this.$scope.$broadcast(this.EDIT_ON_CLICK_TOGGLE_EV, subTask.id);
        });
        // if parent was current task, mark sub task as current now
        if (this.currentTaskId === task.id) {
          this.Tasks.updateCurrent(subTask);
        }
      }
    }

    addLocalAttachment(task) {
      this.Dialogs('EDIT_GLOBAL_LINK', { link: {}, isNew: true, task }, true);
    }

    togglePlay(task) {
      if (task.isDone) {
        task.isDone = false;
      }

      if (this.currentTaskId === task.id) {
        this.Tasks.updateCurrent(undefined);
      } else {
        if (task.subTasks && task.subTasks.length > 0) {
          const firstUndone = task.subTasks.find((cTask) => !cTask.isDone);
          if (firstUndone) {
            this.Tasks.updateCurrent(firstUndone);
          }
        } else {
          this.Tasks.updateCurrent(task);
        }
      }

      if (this.currentTaskId) {
        this.focusCurrentTask();
      }
    }

    static moveItem(array, oldIndex, newIndex) {
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
    }
  }

  // hacky fix for ff
  TaskListCtrl.$$ngIsClass = true;

  angular
    .module('superProductivity')
    .controller('TaskListCtrl', TaskListCtrl)
    .component('taskList', {
      templateUrl: 'scripts/task-list/task-list-d.html',
      bindToController: true,
      controller: 'TaskListCtrl',
      controllerAs: CONTROLLER_AS,
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
        parentTask: '=',
        isHideControls: '<'
      }
    });
})();
