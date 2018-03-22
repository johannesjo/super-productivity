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
    constructor($rootScope, Tasks, Dialogs, TakeABreakReminder, TRACKING_INTERVAL, IS_ELECTRON, IS_EXTENSION, EV, $interval, ExtensionInterface) {
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.Tasks = Tasks;
      this.Dialogs = Dialogs;
      this.TakeABreakReminder = TakeABreakReminder;
      this.ExtensionInterface = ExtensionInterface;
      this.TRACKING_INTERVAL = TRACKING_INTERVAL;
      this.IS_ELECTRON = IS_ELECTRON;
      this.IS_EXTENSION = IS_EXTENSION;
      this.EV = EV;
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
              this.TakeABreakReminder.update(realPeriodDuration, this.isIdle);
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
        this.$rootScope.$broadcast(this.EV.IS_IDLE);

        // do not show as long as the user hasn't decided
        this.TakeABreakReminder.isShown = false;

        if (!this.isIdleDialogOpen) {
          this.isIdleDialogOpen = true;
          this.Dialogs('WAS_IDLE', {
            initialIdleTime: idleTimeInMs,
            minIdleTimeInMs: minIdleTimeInMs,
          })
            .then(() => {
              // if tracked
              this.TakeABreakReminder.isShown = true;
              this.isIdleDialogOpen = false;
            }, () => {
              // if not tracked
              // unset currentSession.timeWorkedWithoutBreak
              this.TakeABreakReminder.resetCounter();
              this.TakeABreakReminder.isShown = true;
              this.isIdleDialogOpen = false;
            });
        }

      } else {
        this.isIdle = false;
        this.$rootScope.$broadcast(this.EV.IS_BUSY);
      }
    }
  }

  angular
    .module('superProductivity')
    .service('TimeTracking', TimeTracking);

  // hacky fix for ff
  TimeTracking.$$ngIsClass = true;
})();
