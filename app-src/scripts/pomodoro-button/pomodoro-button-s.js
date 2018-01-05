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
  const DEFAULT_SOUND = 'snd/positive.ogg';

  //const IPC_EVENT_IS_IDLE = 'IS_IDLE';

  class PomodoroButton {
    /* @ngInject */
    constructor($rootScope, $interval, $q, Dialogs, Tasks, SimpleToast, LS_DEFAULTS, EV, IS_ELECTRON) {
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.IS_ELECTRON = IS_ELECTRON;
      this.EV = EV;
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.$q = $q;
      this.Dialogs = Dialogs;
      this.SimpleToast = SimpleToast;
      this.Tasks = Tasks;

      this.initListeners();

      // TODO: INIT REMOTE INTERFACE
    }

    reInit() {
      this.data = this.$rootScope.r.currentSession.pomodoro;
      this.config = this.$rootScope.r.config.pomodoro;

      if (!this.config) {
        // if it hasn't been initialized (which is the case for older versions of SP)
        this.config = this.$rootScope.r.config.pomodoro = angular.copy(this.LS_DEFAULTS.config.pomodoro);
      }

      this.initSession();
    }

    initListeners() {
      // listen for idle and stop pomodoro session
      //if (this.IS_ELECTRON) {
      //window.ipcRenderer.on(IPC_EVENT_IS_IDLE, () => {
      //  if (this.data.status !== MANUAL_PAUSE) {
      //    this.pause();
      //  }
      //});
      //}

      // listen for current task updates
      this.$rootScope.$on(this.EV.UPDATE_CURRENT_TASK, (ev, args) => {
        // if data is not ready, just return
        if (!this.data) {
          return;
        }

        // don't update anything if on break
        if (this.data.isOnBreak) {
          if (args.task &&
            (this.config.isStopTrackingOnBreak && this.isOnShortBreak() ||
              (this.config.isStopTrackingOnLongBreak && this.isOnLongBreak()))) {
            this.SimpleToast('WARNING', 'You\'re on (pomodoro) break, the task will be started afterwards.');
            this.Tasks.updateCurrent(undefined);
          }
        } else {
          if (args.task && this.data.status !== PLAY) {
            this.play();
          } else if (!args.task && this.data.status !== MANUAL_PAUSE) {
            this.pause();
          }
        }
      });
    }

    initSession() {
      // unset current task
      if (this.config.isEnabled) {
        // NOTE: this has side effects
        this.Tasks.updateCurrent(undefined);
      }

      // DEFAULTS
      this.data.status = MANUAL_PAUSE;
      this.data.currentSessionTime = 0;
      this.data.currentCycle = 1;
      this.data.isOnBreak = false;
      this.setSessionTimerTime();
    }

    play() {
      // select task if none selected
      this.selectTask()
        .then(() => {
          this.start();
        });
    }

    start() {
      this.initTimer();
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

      this.Tasks.updateCurrent(undefined);
    }

    stop() {
      this.data.status = MANUAL_PAUSE;
      this.$interval.cancel(this.timer);

      // unset last focused task
      this.Tasks.setLastCurrent(undefined);
      this.initSession();
    }

    sessionDone() {
      this.playSessionDoneSound();
      this.data.isOnBreak = !this.data.isOnBreak;
      if (this.data.isOnBreak) {
        this.dialog = this.Dialogs('POMODORO_BREAK', {
          pomodoroData: this.data,
          pomodoroConfig: this.config
        })
          .then((isSkipBreak) => {
            if (isSkipBreak) {
              this.skipBreak();
            }
          });

        if ((this.config.isStopTrackingOnBreak && this.isOnShortBreak()) ||
          (this.config.isStopTrackingOnLongBreak && this.isOnLongBreak())) {
          this.Tasks.updateCurrent(undefined);
        }
      } else {
        this.data.currentCycle++;
        this.selectTask();
      }

      this.setSessionTimerTime();
    }

    skipBreak() {
      this.sessionDone();
    }

    setSessionTimerTime() {
      if (this.isOnLongBreak()) {
        this.data.currentSessionTime = moment
          .duration(this.config.longerBreakDuration)
          .asMilliseconds();
      } else if (this.isOnShortBreak()) {
        this.data.currentSessionTime = moment
          .duration(this.config.breakDuration)
          .asMilliseconds();
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

    isOnLongBreak() {
      return (this.data.isOnBreak && (this.data.currentCycle % this.config.cyclesBeforeLongerBreak === 0));
    }

    isOnShortBreak() {
      return (this.data.isOnBreak && (this.data.currentCycle % this.config.cyclesBeforeLongerBreak !== 0));
    }

    selectTask() {
      const defer = this.$q.defer();

      if (!this.Tasks.getCurrent()) {
        const lastCurrentTask = this.Tasks.getLastCurrent();

        if (lastCurrentTask) {
          this.Tasks.updateCurrent(lastCurrentTask);
          defer.resolve();
        } else {
          this.Dialogs('TASK_SELECTION')
            .then(defer.resolve)
            .catch(defer.reject);
        }
      } else {
        defer.resolve();
      }

      return defer.promise;
    }

    playSessionDoneSound() {
      if (this.config.isPlaySound) {
        new Audio(DEFAULT_SOUND).play();
      }
    }
  }

  angular
    .module('superProductivity')
    .service('PomodoroButton', PomodoroButton);

  // hacky fix for ff
  PomodoroButton.$$ngIsClass = true;
})();
