/**
 * @ngdoc component
 * @name superProductivity.component:pomodoroFocus
 * @description
 * # pomodoroFocus
 */

(() => {
  'use strict';

  class PomodoroFocusCtrl {
    /* @ngInject */
    constructor($rootScope, PomodoroButton, Notifier, Tasks, SimpleToast, $state) {
      this.Tasks = Tasks;
      this.SimpleToast = SimpleToast;
      this.PomodoroButton = PomodoroButton;
      this.$state = $state;

      this.svc = PomodoroButton;

      this.r = $rootScope.r;

      this.setTaskData();
      this.setCurrentTask();
      this.handleAllDoneIfNeeded();
    }

    togglePlay() {
      this.PomodoroButton.toggle();
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
    .component('pomodoroFocus', {
      templateUrl: 'scripts/pomodoro-focus/pomodoro-focus-cp.html',
      controller: PomodoroFocusCtrl,
      controllerAs: 'vm',
      bindToController: {},
    });

  // hacky fix for ff
  PomodoroFocusCtrl.$$ngIsClass = true;
})();
