import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  constructor() { }
  //
  //
  // init() {
  //   this.initPoll();
  //
  //   if (this.IS_ELECTRON) {
  //     this.handleIdleElectron();
  //   }
  //   if (this.IS_EXTENSION) {
  //     this.handleIdleExtension();
  //   }
  // }
  //
  // initPoll() {
  //   let currentTrackingStart = moment();
  //
  //   setInterval(() => {
  //     if (this.$rootScope.r.currentTask) {
  //
  //       let now = moment();
  //
  //       // if there is a start value
  //       let realPeriodDuration = moment.duration(now.diff(currentTrackingStart))
  //         .asMilliseconds();
  //
  //       // only track if not idle and interval is smaller than threshold
  //       if (!this.isIdle && realPeriodDuration <= MAX_TRACKING_PERIOD_VAL) {
  //         this.Tasks.addTimeSpent(this.$rootScope.r.currentTask, realPeriodDuration);
  //         this.EstimateExceededChecker.checkTaskAndNotify(this.$rootScope.r.currentTask);
  //       }
  //
  //       // set to now
  //       currentTrackingStart = moment();
  //
  //
  //     } else {
  //       // reset currentTrackingStart
  //       currentTrackingStart = moment();
  //     }
  //   }, this.TRACKING_INTERVAL);
  // }
  //
  // handleIdleExtension() {
  //   this.ExtensionInterface.addEventListener(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
  //     this.handleIdle(idleTimeInMs);
  //   });
  // }
  //
  // handleIdleElectron() {
  //   window.ipcRenderer.on(IPC_EVENT_IDLE_TIME, (ev, idleTimeInMs) => {
  //     this.handleIdle(idleTimeInMs);
  //   });
  // }
  //
  // handleIdle(idleTimeInMs) {
  //   // don't run if option is not enabled
  //   if (!this.$rootScope.r.config.isEnableIdleTimeTracking) {
  //     this.isIdle = false;
  //     return;
  //   }
  //   const minIdleTimeInMs = moment.duration(this.$rootScope.r.config.minIdleTime)
  //     .asMilliseconds();
  //
  //   if (idleTimeInMs > minIdleTimeInMs) {
  //     this.isIdle = true;
  //
  //     // do not show as long as the user hasn't decided
  //     this.TakeABreakReminder.isShown = false;
  //
  //     if (!this.isIdleDialogOpen &&
  //       (!this.PomodoroButton.config.isEnabled || !this.PomodoroButton.data.isOnBreak)) {
  //       const initialIdleTime = idleTimeInMs;
  //
  //       if (this.$rootScope.r.currentTask) {
  //         // remove idle time already tracked
  //         this.Tasks.removeTimeSpent(this.$rootScope.r.currentTask.id, this.$window.moment.duration(initialIdleTime));
  //       }
  //
  //       this.isIdleDialogOpen = true;
  //       this.initIdlePoll(initialIdleTime);
  //       this.$rootScope.$broadcast(this.EV.IS_IDLE);
  //       this.Dialogs('WAS_IDLE', {
  //         initialIdleTime: initialIdleTime,
  //       })
  //         .then((res) => {
  //           // if tracked
  //           // ----------
  //           if (res.isResetTakeABreakTimer) {
  //             this.TakeABreakReminder.resetCounter();
  //           }
  //           // add the idle time in milliseconds + the minIdleTime that was
  //           // not tracked or removed
  //           if (res.selectedTask && res.selectedTask.id) {
  //             this.Tasks.addTimeSpent(res.selectedTask, this.idleTime);
  //             // set current task to the selected one
  //             this.Tasks.updateCurrent(res.selectedTask);
  //           } else {
  //             console.error('No Task selected');
  //           }
  //
  //           this.TakeABreakReminder.isShown = true;
  //           this.isIdleDialogOpen = false;
  //           this.cancelIdlePoll();
  //         }, () => {
  //           // if not tracked
  //           // --------------
  //           this.TakeABreakReminder.resetCounter();
  //           this.TakeABreakReminder.isShown = true;
  //           this.isIdleDialogOpen = false;
  //           this.cancelIdlePoll();
  //         });
  //     }
  //
  //   } else {
  //     this.isIdle = false;
  //     this.$rootScope.$broadcast(this.EV.IS_BUSY);
  //   }
  // }
  //
  //
  // initIdlePoll(idleTimeInMs) {
  //   const POLL_INTERVAL = 1000;
  //   const idleStart = this.$window.moment();
  //
  //   const initialIdleTime = idleTimeInMs;
  //   let realIdleTime = idleTimeInMs;
  //   this.idleTime = realIdleTime;
  //
  //   this.idlePollInterval = this.$interval(() => {
  //     const now = this.$window.moment();
  //     realIdleTime = this.$window.moment
  //       .duration(now.diff(idleStart))
  //       .add(initialIdleTime)
  //       .asMilliseconds();
  //     this.idleTime = realIdleTime;
  //   }, POLL_INTERVAL);
  // }
  //
  // cancelIdlePoll() {
  //   if (this.idlePollInterval) {
  //     this.$interval.cancel(this.idlePollInterval);
  //     this.idleTime = 0;
  //   }
  // }
}
