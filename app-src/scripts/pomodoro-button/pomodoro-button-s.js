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
  const TICK_INTERVAL = 500;
  const DEFAULT_SOUND = 'snd/positive.ogg';

  class PomodoroButton {
    /* @ngInject */
    constructor($rootScope, $interval, $q, Dialogs, Tasks, SimpleToast, LS_DEFAULTS, EV, IS_ELECTRON, Notifier, $state, TakeABreakReminder) {
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.IS_ELECTRON = IS_ELECTRON;
      this.EV = EV;
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.$state = $state;
      this.$q = $q;
      this.Dialogs = Dialogs;
      this.SimpleToast = SimpleToast;
      this.Tasks = Tasks;
      this.TakeABreakReminder = TakeABreakReminder;
      this.Notifier = Notifier;

      this.initListeners();
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
      if (this.IS_ELECTRON) {
        this.$rootScope.$on(this.EV.IS_IDLE, () => {
          // if pomodoro is disabled just return
          if (this.config && !this.config.isEnabled) {
            return;
          }

          if (this.data.status !== MANUAL_PAUSE) {
            this.pause();
          }
        });
      }

      // listen for current task updates
      this.$rootScope.$on(this.EV.UPDATE_CURRENT_TASK, (ev, args) => {
        // if pomodoro is disabled just return
        if (this.config && !this.config.isEnabled) {
          return;
        }

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
      this.Tasks.startLastTaskOrOpenDialog()
        .then(() => {
          this.start();

          if (this.config.isGoToWorkView) {
            this.$state.go('work-view');
          }
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

      // handle special state when manual continue is activated and the dialog
      // was clicked away
      if (this.config.isManualContinue && this.data.isOnBreak && (this.dialog && this.dialog.$$state.status === 1)) {
        this.data.currentSessionTime = 0;
        this.pause();
        this.openDialog(true);
      }

      // regular handling
      else {
        this.data.isOnBreak = !this.data.isOnBreak;
        if (this.data.isOnBreak) {
          this.TakeABreakReminder.resetCounter();
          this.Notifier({
            title: 'Pomodoro break #' + this.data.currentCycle + ' started.',
          });
          this.openDialog();

          if ((this.config.isStopTrackingOnBreak && this.isOnShortBreak()) ||
            (this.config.isStopTrackingOnLongBreak && this.isOnLongBreak())) {
            this.Tasks.updateCurrent(undefined);
          }
        } else {
          this.data.currentCycle++;
          this.Tasks.startLastTaskOrOpenDialog()
            .then((task) => {
              this.Notifier({
                title: `Pomodoro session #${this.data.currentCycle} started`,
                message: task && (`Working on >>  ${task.title}`),
              });
            });
        }
        this.setSessionTimerTime();
      }
    }

    openDialog(isBreakDone) {
      this.dialog = this.Dialogs('POMODORO_BREAK', {
        pomodoroData: this.data,
        pomodoroConfig: this.config,
        isBreakDone: isBreakDone,
      })
        .then((isSkipBreak) => {
          if (isSkipBreak) {
            this.skipBreak();
          }
        });

      return this.dialog;
    }

    skipBreak() {
      this.sessionDone();
      this.TakeABreakReminder.resetResetCounter();
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

      this.data.currentSessionInitialTime = this.data.currentSessionTime;
    }

    initTimer() {
      this.lastIntervalStart = moment();
      if (this.timer) {
        this.$interval.cancel(this.timer);
      }

      this.timer = this.$interval(() => {
        this.tick();
      }, TICK_INTERVAL);
    }

    tick() {
      const now = moment();
      this.data.currentSessionTime -= moment.duration(now.diff(this.lastIntervalStart)).asMilliseconds();

      this.lastIntervalStart = moment();

      if (this.data.currentSessionTime <= 0) {
        this.sessionDone();
      }

      if (this.IS_ELECTRON) {
        this.sendUpdateToRemoteInterface();
      }
    }

    isOnLongBreak() {
      return (this.data.isOnBreak && (this.data.currentCycle % this.config.cyclesBeforeLongerBreak === 0));
    }

    isOnShortBreak() {
      return (this.data.isOnBreak && (this.data.currentCycle % this.config.cyclesBeforeLongerBreak !== 0));
    }

    playSessionDoneSound() {
      if (this.config.isPlaySound) {
        new Audio(DEFAULT_SOUND).play();
      }
    }

    sendUpdateToRemoteInterface() {
      if (this.IS_ELECTRON) {
        window.ipcRenderer.send(this.EV.IPC_EVENT_POMODORO_UPDATE, {
          isOnBreak: this.data.isOnBreak,
          currentSessionTime: this.data.currentSessionTime,
          currentSessionInitialTime: this.data.currentSessionInitialTime
        });
      }
    }
  }

  angular
    .module('superProductivity')
    .service('PomodoroButton', PomodoroButton);

  // hacky fix for ff
  PomodoroButton.$$ngIsClass = true;
})();
