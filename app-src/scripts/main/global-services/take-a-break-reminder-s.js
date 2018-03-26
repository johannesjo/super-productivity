/**
 * @ngdoc service
 * @name superProductivity.TakeABreakReminder
 * @description
 * # TakeABreakReminder
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('TakeABreakReminder', TakeABreakReminder);

  /* @ngInject */
  function TakeABreakReminder($rootScope, Notifier, $mdToast, ParseDuration, $timeout) {
    this.isShown = true;

    const TOAST_DISPLAY_TIME = 30000;
    let toast;

    this.isEnabled = () => {
      return $rootScope.r.config && $rootScope.r.config.isTakeABreakEnabled;
    };

    this.resetCounter = () => {
      this.lastCounterValBeforeReset = $rootScope.r.currentSession.timeWorkedWithoutBreak;
      $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;
    };

    this.resetResetCounter = () => {
      $rootScope.r.currentSession.timeWorkedWithoutBreak = this.lastCounterValBeforeReset;
      this.lastCounterValBeforeReset = undefined;
    };

    let timeoutRunning = false;
    this.notificationTimeout = () => {
      if (!timeoutRunning) {
        timeoutRunning = true;
        $timeout(() => {
          timeoutRunning = false;
        }, TOAST_DISPLAY_TIME);
      }

      return timeoutRunning;
    };

    this.update = (timeSpentInMs, isIdle) => {
      if (this.isEnabled()) {
        if (!$rootScope.r.currentSession) {
          $rootScope.r.currentSession = {};
        }
        // add or create moment duration for timeWorkedWithoutBreak
        if ($rootScope.r.currentSession.timeWorkedWithoutBreak) {
          // convert to moment to be save
          $rootScope.r.currentSession.timeWorkedWithoutBreak = moment.duration($rootScope.r.currentSession.timeWorkedWithoutBreak);
          $rootScope.r.currentSession.timeWorkedWithoutBreak.add(moment.duration({ milliseconds: timeSpentInMs }));
        } else {
          $rootScope.r.currentSession.timeWorkedWithoutBreak = moment.duration(timeSpentInMs);
        }

        if (moment.duration($rootScope.r.config.takeABreakMinWorkingTime)
            .asSeconds() < $rootScope.r.currentSession.timeWorkedWithoutBreak.asSeconds()) {

          if (isIdle) {
            return;
          }

          if (this.isShown && !timeoutRunning) {
            this.notificationTimeout();
            const durationStr = ParseDuration.toString($rootScope.r.currentSession.timeWorkedWithoutBreak);
            const message = $rootScope.r.config && $rootScope.r.config.takeABreakMessage && $rootScope.r.config.takeABreakMessage.replace(/\$\{duration\}/gi, durationStr);

            toast = $mdToast.simple()
              .textContent(message)
              .action('I already did!')
              .hideDelay(TOAST_DISPLAY_TIME)
              .position('bottom');
            $mdToast.show(toast).then(function(response) {
              if (response === 'ok') {
                // re-add task on undo
                $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;
              }
            });

            Notifier({
              title: 'Take a break!',
              message: message,
              sound: true,
              wait: true
            });
          }

        }
      }
    };
  }

})();
