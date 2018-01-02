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
