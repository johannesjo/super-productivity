/**
 * @ngdoc service
 * @name superProductivity.TimeTracking
 * @description
 * # TimeTracking
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const IPC_EVENT_CURRENT_TASK_UPDATED = 'CHANGED_CURRENT_TASK';
  const IPC_EVENT_IDLE_TIME = 'IDLE_TIME';
  const MAX_TRACKING_PERIOD_VAL = 60000;

  class TimeTracking {
    /* @ngInject */
    constructor($rootScope, Tasks, Dialogs, TakeABreakReminder, TRACKING_INTERVAL, IS_ELECTRON, IS_EXTENSION, EV, $interval, ExtensionInterface, EstimateExceededChecker, $window, PomodoroButton) {
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.$window = $window;
      this.Tasks = Tasks;
      this.Dialogs = Dialogs;
      this.TakeABreakReminder = TakeABreakReminder;
      this.ExtensionInterface = ExtensionInterface;
      this.EstimateExceededChecker = EstimateExceededChecker;
      this.PomodoroButton = PomodoroButton;
      this.TRACKING_INTERVAL = TRACKING_INTERVAL;
      this.IS_ELECTRON = IS_ELECTRON;
      this.IS_EXTENSION = IS_EXTENSION;
      this.EV = EV;

      this.idlePollInterval = undefined;
      this.idleTime = undefined;
    }

    init() {
      this.initPoll();

      if (this.IS_ELECTRON) {
        this.handleIdleElectron();
      }
      if (this.IS_EXTENSION) {
        this.handleIdleExtension();
      }
    }

    initPoll() {
      let currentTrackingStart = moment();

      this.$interval(() => {
        if (this.$rootScope.r.currentTask) {

          let now = moment();

          // if there is a start value
          let realPeriodDuration = moment.duration(now.diff(currentTrackingStart))
            .asMilliseconds();

          // only track if not idle and interval is smaller than threshold
          if (!this.isIdle && realPeriodDuration <= MAX_TRACKING_PERIOD_VAL) {
            this.Tasks.addTimeSpent(this.$rootScope.r.currentTask, realPeriodDuration);
            this.EstimateExceededChecker.checkTaskAndNotify(this.$rootScope.r.currentTask);
          }

          // set to now
          currentTrackingStart = moment();

          if (this.IS_ELECTRON) {
            // update indicator
            window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, {
              current: this.$rootScope.r.currentTask,
              lastActiveTask: this.Tasks.getLastActiveIfStartable()
            });
          }

          if (this.IS_ELECTRON || this.IS_EXTENSION) {
            if (!this.isIdle) {
              this.TakeABreakReminder.update(realPeriodDuration);
            }
          }

        } else {
          // reset currentTrackingStart
          currentTrackingStart = moment();
        }
      }, this.TRACKING_INTERVAL);
    }

    handleIdleExtension() {
      this.ExtensionInterface.addEventListener(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    }

    handleIdleElectron() {
      window.ipcRenderer.on(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
        this.handleIdle(idleTimeInMs);
      });
    }

    handleIdle(idleTimeInMs) {
      // don't run if option is not enabled
      if (!this.$rootScope.r.config.isEnableIdleTimeTracking) {
        this.isIdle = false;
        return;
      }
      const minIdleTimeInMs = moment.duration(this.$rootScope.r.config.minIdleTime)
        .asMilliseconds();

      if (idleTimeInMs > minIdleTimeInMs) {
        this.isIdle = true;

        // do not show as long as the user hasn't decided
        this.TakeABreakReminder.isShown = false;

        if (!this.isIdleDialogOpen &&
          (!this.PomodoroButton.config.isEnabled || !this.PomodoroButton.data.isOnBreak)) {
          const initialIdleTime = idleTimeInMs;

          if (this.$rootScope.r.currentTask) {
            // remove idle time already tracked
            this.Tasks.removeTimeSpent(this.$rootScope.r.currentTask.id, this.$window.moment.duration(initialIdleTime));
          }

          this.isIdleDialogOpen = true;
          this.initIdlePoll(initialIdleTime);
          this.$rootScope.$broadcast(this.EV.IS_IDLE);
          this.Dialogs('WAS_IDLE', {
            initialIdleTime: initialIdleTime,
          })
            .then((res) => {
              // if tracked
              // ----------
              if (res.isResetTakeABreakTimer) {
                this.TakeABreakReminder.resetCounter();
              }
              // add the idle time in milliseconds + the minIdleTime that was
              // not tracked or removed
              if (res.selectedTask && res.selectedTask.id) {
                this.Tasks.addTimeSpent(res.selectedTask, this.idleTime);
                // set current task to the selected one
                this.Tasks.updateCurrent(res.selectedTask);
              } else {
                console.error('No Task selected');
              }

              this.TakeABreakReminder.isShown = true;
              this.isIdleDialogOpen = false;
              this.cancelIdlePoll();
            }, () => {
              // if not tracked
              // --------------
              this.TakeABreakReminder.resetCounter();
              this.TakeABreakReminder.isShown = true;
              this.isIdleDialogOpen = false;
              this.cancelIdlePoll();
            });
        }

      } else {
        this.isIdle = false;
        this.$rootScope.$broadcast(this.EV.IS_BUSY);
      }
    }


    initIdlePoll(idleTimeInMs) {
      const POLL_INTERVAL = 1000;
      const idleStart = this.$window.moment();

      const initialIdleTime = idleTimeInMs;
      let realIdleTime = idleTimeInMs;
      this.idleTime = realIdleTime;

      this.idlePollInterval = this.$interval(() => {
        const now = this.$window.moment();
        realIdleTime = this.$window.moment
          .duration(now.diff(idleStart))
          .add(initialIdleTime)
          .asMilliseconds();
        this.idleTime = realIdleTime;
      }, POLL_INTERVAL);
    }

    cancelIdlePoll() {
      if (this.idlePollInterval) {
        this.$interval.cancel(this.idlePollInterval);
        this.idleTime = 0;
      }
    }
  }

  angular
    .module('superProductivity')
    .service('TimeTracking', TimeTracking);

  // hacky fix for ff
  TimeTracking.$$ngIsClass = true;
})();
