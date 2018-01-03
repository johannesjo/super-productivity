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
    constructor(PomodoroButton) {
      this.svc = PomodoroButton;
    }

    play() {
      this.svc.play();
      this.isOpen = false;
    }

    pause() {
      this.svc.pause();
      this.isOpen = false;
    }

    stop() {
      this.svc.stop();
      this.isOpen = false;
    }

    toggle() {
      this.svc.toggle();
      this.isOpen = false;
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
