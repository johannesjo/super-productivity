/**
 * @ngdoc service
 * @name superProductivity.TakeABreakReminder
 * @description
 * # TakeABreakReminder
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('TakeABreakReminder', TakeABreakReminder);

  /* @ngInject */
  function TakeABreakReminder($rootScope, Notifier, $mdToast, ParseDuration) {
    const MIN_IDLE_VAL_TO_TAKE_A_BREAK_FROM_TAKE_A_BREAK = 9999;

    this.isShown = true;

    this.check = (timeSpentInMs, idleTimeInMs) => {
      if ($rootScope.r.config && $rootScope.r.config.isTakeABreakEnabled) {
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

          if (idleTimeInMs > MIN_IDLE_VAL_TO_TAKE_A_BREAK_FROM_TAKE_A_BREAK) {
            return;
          }

          if (this.isShown) {
            const durationStr = ParseDuration.toString($rootScope.r.currentSession.timeWorkedWithoutBreak);
            const message = $rootScope.r.config && $rootScope.r.config.takeABreakMessage && $rootScope.r.config.takeABreakMessage.replace(/\$\{duration\}/gi, durationStr);

            let toast = $mdToast.simple()
              .textContent(message)
              .action('I already did!')
              .hideDelay(20000)
              .position('bottom');
            $mdToast.show(toast).then(function (response) {
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
