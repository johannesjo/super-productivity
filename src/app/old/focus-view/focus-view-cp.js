/**
 * @ngdoc component
 * @name superProductivity.component:focusView
 * @description
 * # focusView
 */

(() => {
  'use strict';

  class FocusViewCtrl {
    /* @ngInject */
    constructor($rootScope, PomodoroButton, Notifier, Tasks, SimpleToast, $state) {
      this.Tasks = Tasks;
      this.SimpleToast = SimpleToast;
      this.PomodoroButton = PomodoroButton;
      this.$state = $state;

      this.pomodoroSvc = PomodoroButton;

      this.r = $rootScope.r;

      this.setTaskData();
      this.setCurrentTask();
      this.handleAllDoneIfNeeded();
    }

    togglePlayPomodoro() {
      this.PomodoroButton.toggle();
    }

    toggleMarkAsCurrentTask() {
      if (this.Tasks.getCurrent()) {
        this.Tasks.updateCurrent(undefined);
      } else {
        this.Tasks.updateCurrent(this.task);
      }
    }

    setCurrentTask() {
      this.currentTask = this.Tasks.getCurrent();
    }

    setTaskData() {
      this.task = this.Tasks.getCurrent() || this.Tasks.getLastCurrent();

      if (this.task) {
        if (this.task.parentId) {
          this.parentTitle = this.Tasks.getById(this.task.parentId).title;
        } else {
          this.parentTitle = undefined;
        }
      } else {
        this.Tasks.startLastTaskOrOpenDialog()
          .then(() => {
            this.setTaskData();
            this.setCurrentTask();
          });
      }
    }

    handleAllDoneIfNeeded() {
      if (this.task && this.task.isDone) {
        this.Tasks.startLastTaskOrOpenDialog()
          .then(() => {
            this.setTaskData();
            this.setCurrentTask();
          });
      }
    }

    markAsDone() {
      this.Tasks.markAsDone(this.task);
      this.setTaskData();
      this.handleAllDoneIfNeeded();
    }
  }

  angular
    .module('superProductivity')
    .component('focusView', {
      templateUrl: 'scripts/focus-view/focus-view-cp.html',
      controller: FocusViewCtrl,
      controllerAs: 'vm',
      bindToController: {},
    });

  // hacky fix for ff
  FocusViewCtrl.$$ngIsClass = true;
})();
