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
  const IPC_EVENT_BUSY = 'IS_BUSY';

  class TimeTracking {
    /* @ngInject */
    constructor($rootScope, Tasks, Dialogs, TakeABreakReminder, TRACKING_INTERVAL, IS_ELECTRON, EV, $interval) {
      this.$rootScope = $rootScope;
      this.$interval = $interval;
      this.Tasks = Tasks;
      this.Dialogs = Dialogs;
      this.TakeABreakReminder = TakeABreakReminder;
      this.TRACKING_INTERVAL = TRACKING_INTERVAL;
      this.IS_ELECTRON = IS_ELECTRON;
      this.EV = EV;
    }

    init() {
      this.initPoll();

      if (this.IS_ELECTRON) {
        this.handleIdle();
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

          if (!this.isIdle) {
            this.Tasks.addTimeSpent(this.$rootScope.r.currentTask, realPeriodDuration);
          }

          // set to now
          currentTrackingStart = moment();

          if (this.IS_ELECTRON) {
            // update indicator
            window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, {
              current: this.$rootScope.r.currentTask,
              lastCurrent: this.Tasks.lastCurrentTask
            });

            if (!this.isIdle) {
              this.TakeABreakReminder.update(realPeriodDuration, this.isIdle);
            }
          }
        }
      }, this.TRACKING_INTERVAL);
    }

    handleIdle() {
      const TMP_MIN_IDLE = 3 * 1000;

      window.ipcRenderer.on(IPC_EVENT_IDLE_TIME, (ev, idleTime) => {
        console.log(idleTime, TMP_MIN_IDLE, idleTime);

        if (idleTime > TMP_MIN_IDLE) {
          this.isIdle = true;
          this.$rootScope.$broadcast(this.EV.IS_IDLE);

          // do not show as long as the user hasn't decided
          this.TakeABreakReminder.isShown = false;

          if (!this.isIdleDialogOpen) {
            this.isIdleDialogOpen = true;
            this.Dialogs('WAS_IDLE', {
              initialIdleTime: idleTime,
              minIdleTimeInMs: TMP_MIN_IDLE,
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
      });
    }

    // handler for time spent tracking
    //  if (!isIdleDialogOpen) {
    //    // only track if there is a task
    //    if (that.$rootScope.r.currentTask) {
    //      let timeSpentInMs = evData.timeSpentInMs;
    //      let idleTimeInMs = evData.idleTimeInMs;
    //
    //      TakeABreakReminder.check(timeSpentInMs, idleTimeInMs);
    //
    //      // track
    //      that.addTimeSpent(that.$rootScope.r.currentTask, timeSpentInMs);
    //
    //      // update indicator
    //      window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, {
    //        current: that.$rootScope.r.currentTask,
    //        lastCurrent: that.lastCurrentTask
    //      });
    //
    //      // we need to manually call apply as that is an outside event
    //      that.$rootScope.$apply();
    //    }
    //  }
  }

  angular
    .module('superProductivity')
    .service('TimeTracking', TimeTracking);

  // hacky fix for ff
  TimeTracking.$$ngIsClass = true;
})();
