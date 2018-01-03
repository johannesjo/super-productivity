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

      this.config = this.$rootScope.r.config.pomodoro;

      // DEFAULTS
      this.data.status = STOP;
      this.data.currentSessionTime = 0;
      this.data.currentCycle = 1;
      this.data.isOnBreak = false;

      console.log(this.config);
      console.log(moment.duration(this.config.longerBreakDuration).asMilliseconds());
      console.log(moment.duration(this.config.duration).asMilliseconds());
      // TODO: INIT REMOTE INTERFACE
    }

    play() {
      this.data.status = PLAY;
      this.initTimer();
    }

    toggle() {
      if (this.data.status === PLAY) {
        this.pause();
      } else{
        this.play();
      }
    }

    pause() {
      this.data.status = PAUSE;
      this.$interval.cancel(this.timer);
    }

    stop() {
      this.data.status = STOP;
      this.$interval.cancel(this.timer);
    }

    sessionDone() {
      this.data.isOnBreak = !this.data.isOnBreak;
      if (!this.data.isOnBreak) {
        this.data.currentCycle++;
      }

      this.initTimer();
    }

    initTimer() {
      if (this.data.isOnBreak) {
        // init break session timer
        if (this.data.currentCycle % this.config.cyclesBeforeLongerBreak === 0) {
          this.data.currentSessionTime = moment
            .duration(this.config.longerBreakDuration)
            .asMilliseconds();
        } else {
          this.data.currentSessionTime = moment
            .duration(this.config.breakDuration)
            .asMilliseconds();
        }
      } else {
        // init work session timer
        this.data.currentSessionTime = moment.duration(this.config.duration).asMilliseconds();
      }

      if (this.timer) {
        this.$interval.cancel(this.timer);
      }

      this.timer = this.$interval(() => {
        this.tick();
      }, TICK_INTERVAL);
    }

    tick() {
      this.data.currentSessionTime -= TICK_INTERVAL;
      if (this.data.currentSessionTime <= 0) {
        this.sessionDone();
      }
    }
  }

  angular
    .module('superProductivity')
    .service('PomodoroButton', PomodoroButton);

  // hacky fix for ff
  PomodoroButton.$$ngIsClass = true;
})();
