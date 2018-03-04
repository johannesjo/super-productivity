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

      this.currentTask = Tasks.getCurrent();
      this.task = Tasks.getCurrent() || Tasks.getLastCurrent();
      this.r = $rootScope.r;

      this.getTaskData();
      this.handleAllDone();
    }

    togglePlay() {
      this.PomodoroButton.toggle();
    }

    getTaskData() {
      this.currentTask = this.Tasks.getCurrent();
      this.task = this.Tasks.getCurrent() || this.Tasks.getLastCurrent();
    }

    handleAllDone() {
      if (this.task.isDone) {
        this.Tasks.startLastTaskOrOpenDialog()
          .then(() => {
            this.getTaskData();
          });
      }
    }

    markAsDone() {
      this.Tasks.markAsDone(this.task);
      this.task = this.Tasks.getCurrent() || this.Tasks.getLastCurrent();
      this.handleAllDone();
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
