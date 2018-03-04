/**
 * @ngdoc component
 * @name superProductivity.component:pomodoroButton
 * @description
 * # pomodoroButton
 */

(() => {
  'use strict';

  class PomodoroButtonCtrl {
    /* @ngInject */
    constructor(PomodoroButton, Dialogs) {
      this.svc = PomodoroButton;
      this.Dialogs = Dialogs;
    }

    play($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.svc.play();
      this.isOpen = false;
    }

    pause($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.svc.pause();
      this.isOpen = false;
    }

    stop($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.svc.stop();
      this.isOpen = false;
    }

    toggle($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.svc.toggle();
      this.isOpen = false;
    }

    skipBreak($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.svc.skipBreak();
    }

    focusMode($ev) {
      $ev.preventDefault();
      $ev.stopPropagation();
      this.Dialogs('POMODORO_FOCUS', {
        pomodoroData: this.svc.data,
        pomodoroConfig: this.svc.config
      }, true);
    }
  }

  angular
    .module('superProductivity')
    .component('pomodoroButton', {
      templateUrl: 'scripts/pomodoro-button/pomodoro-button-cp.html',
      controller: PomodoroButtonCtrl,
      controllerAs: '$ctrl',
      bindToController: {},
    });

  // hacky fix for ff
  PomodoroButtonCtrl.$$ngIsClass = true;
})();
