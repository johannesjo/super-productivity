/**
 * @ngdoc service
 * @name superProductivity.PomodoroButton
 * @description
 * # PomodoroButton
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const PLAY = 'PLAY';
  const PAUSE = 'PAUSE';
  const STOP = 'STOP';
  const TICK_INTERVAL = 1000;

  class PomodoroButton {
    /* @ngInject */
    constructor($rootScope, $interval) {
      this.$rootScope = $rootScope;
      this.$interval = $interval;

      this.data = this.$rootScope.r.currentSession.pomodoro || {};
      this.$rootScope.r.currentSession.pomodoro = this.data;

      // DEFAULTS
      this.data.status = STOP;
      this.data.currentSessionTime = 0;

      // TODO: INIT REMOTE INTERFACE
    }

    play() {
      this.data.status = PLAY;

      if (this.data.currentSessionTime) {
        this.continueTimer();
      } else {
        this.initTimer();
      }
    }

    pause() {
      this.data.status = PAUSE;
      this.$interval.cancel(this.timer);
    }

    stop() {
      this.data.status = STOP;
      this.$interval.cancel(this.timer);
      this.data.currentSessionTime = 0;
    }

    initTimer() {
      this.data.currentSessionTime = 0;
      this.continueTimer();
    }

    continueTimer() {
      this.timer = this.$interval(() => {
        this.tick();
      }, TICK_INTERVAL);
    }

    tick() {
      this.data.currentSessionTime += TICK_INTERVAL;
      console.log('TICK', this.data.currentSessionTime);
    }
  }

  angular
    .module('superProductivity')
    .service('PomodoroButton', PomodoroButton);

  // hacky fix for ff
  PomodoroButton.$$ngIsClass = true;
})();
