/**
 * @ngdoc service
 * @name superProductivity.EstimateExceededChecker
 * @description
 * # EstimateExceededChecker
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const EXTRA_TIME_BETWEEN_NOTIFICATIONS = 60 * 1000;

  class EstimateExceededChecker {
    /* @ngInject */
    constructor($mdToast, Notifier, $rootScope, $timeout) {
      this.$mdToast = $mdToast;
      this.Notifier = Notifier;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;
      this.currentToastPromise = undefined;
      this.notificationTimeout = undefined;
      this.isNotificationTimeoutRunning = false;
    }

    checkTaskAndNotify(task) {
      if (!this.isEnabled()) {
        return;
      }

      if (task.timeEstimate && task.timeSpent && moment.duration(task.timeSpent)
          .asMinutes() > moment.duration(task.timeEstimate).asMinutes()) {
        this.notify(task);
      }
    }

    isEnabled() {
      return this.$rootScope.r.config && this.$rootScope.r.config.isNotifyWhenTimeEstimateExceeded;
    }

    isToastOpen() {
      return (this.currentToastPromise && this.currentToastPromise.$$state.status === 0);
    }

    reInitNotificationTimeout() {
      if (this.notificationTimeout) {
        this.$timeout.cancel(this.notificationTimeout);
      }

      this.isNotificationTimeoutRunning = true;
      this.notificationTimeout = this.$timeout(() => {
        this.isNotificationTimeoutRunning = false;
      }, EXTRA_TIME_BETWEEN_NOTIFICATIONS);
    }

    notify(task) {
      if (!this.isToastOpen() && !this.isNotificationTimeoutRunning) {
        this.reInitNotificationTimeout();

        const msg = `You exceeded your estimated time for "${task.title}".`;
        const toast = this.$mdToast.simple()
          .textContent(msg)
          .action('Add 1/2 hour')
          .hideDelay(10000)
          .position('bottom');

        this.currentToastPromise = this.$mdToast.show(toast)
          .then((response) => {
            if (response === 'ok') {
              task.timeEstimate = moment.duration(task.timeEstimate);
              task.timeEstimate.add(moment.duration({ minutes: 30 }));
            }
          });

        this.Notifier({
          title: 'Time estimate exceeded!',
          message: msg,
          sound: true,
          wait: true
        });
      }
    }
  }

  angular
    .module('superProductivity')
    .service('EstimateExceededChecker', EstimateExceededChecker);

  // hacky fix for ff
  EstimateExceededChecker.$$ngIsClass = true;
})();
