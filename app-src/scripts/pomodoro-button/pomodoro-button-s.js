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
  const MANUAL_PAUSE = 'MANUAL_PAUSE';
  const TICK_INTERVAL = 1000;

  class PomodoroButton {
    /* @ngInject */
    constructor($rootScope, $interval, Dialogs, Tasks) {
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.Dialogs = Dialogs;
      this.Tasks = Tasks;

      this.data = this.$rootScope.r.currentSession.pomodoro || {};
      this.$rootScope.r.currentSession.pomodoro = this.data;

      this.config = this.$rootScope.r.config.pomodoro;

      this.initSession();

      // TODO: INIT REMOTE INTERFACE
    }

    initSession() {
      // DEFAULTS
      this.data.status = MANUAL_PAUSE;
      this.data.currentSessionTime = 0;
      this.data.currentCycle = 1;
      this.data.isOnBreak = false;
      this.setSessionTimerTime();
    }

    play() {
      // select task if none selected
      this.selectTask(this.start);
    }

    start() {
      if (this.data.status !== MANUAL_PAUSE) {
        this.setSessionTimerTime();
      }

      this.initTimer();
      // import that the status is set afterwards
      this.data.status = PLAY;
    }

    toggle() {
      if (this.data.status === PLAY) {
        this.pause();
      } else {
        this.play();
      }
    }

    pause() {
      this.data.status = MANUAL_PAUSE;
      this.$interval.cancel(this.timer);

      this.lastCurrentTask = this.Tasks.getCurrent() || this.lastCurrentTask;
      this.Tasks.updateCurrent(undefined);
    }

    stop() {
      this.data.status = MANUAL_PAUSE;
      this.$interval.cancel(this.timer);
      this.initSession();
    }

    sessionDone() {
      this.data.isOnBreak = !this.data.isOnBreak;
      if (this.data.isOnBreak) {
        this.lastCurrentTask = this.Tasks.getCurrent();
        this.Tasks.updateCurrent(undefined);
      } else {
        this.data.currentCycle++;
        this.selectTask()
      }

      this.setSessionTimerTime();
    }

    setSessionTimerTime() {
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
    }

    initTimer() {
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

    selectTask(cb) {
      if (!this.Tasks.getCurrent()) {
        if (this.lastCurrentTask) {
          this.Tasks.updateCurrent(this.lastCurrentTask);
          cb && cb.apply(this);
        } else {
          this.Dialogs('TASK_SELECTION')
            .then(() => {
              cb && cb.apply(this);
            });
        }
      } else {
        cb && cb.apply(this);
      }
    }
  }

  angular
    .module('superProductivity')
    .service('PomodoroButton', PomodoroButton);

  // hacky fix for ff
  PomodoroButton.$$ngIsClass = true;
})();
