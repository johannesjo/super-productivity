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
  function TakeABreakReminder($localStorage, Notifier, $mdToast, ParseDuration) {
    const MIN_IDLE_VAL_TO_TAKE_A_BREAK_FROM_TAKE_A_BREAK = 9999;

    this.isShown = true;

    this.check = (timeSpentInMs, idleTimeInMs) => {
      if ($localStorage.config && $localStorage.config.isTakeABreakEnabled) {
        if (!$localStorage.currentSession) {
          $localStorage.currentSession = {};
        }
        // add or create moment duration for timeWorkedWithoutBreak
        if ($localStorage.currentSession.timeWorkedWithoutBreak) {
          // convert to moment to be save
          $localStorage.currentSession.timeWorkedWithoutBreak = moment.duration($localStorage.currentSession.timeWorkedWithoutBreak);
          $localStorage.currentSession.timeWorkedWithoutBreak.add(moment.duration({ milliseconds: timeSpentInMs }));
        } else {
          $localStorage.currentSession.timeWorkedWithoutBreak = moment.duration(timeSpentInMs);
        }

        if (moment.duration($localStorage.config.takeABreakMinWorkingTime)
            .asSeconds() < $localStorage.currentSession.timeWorkedWithoutBreak.asSeconds()) {

          if (idleTimeInMs > MIN_IDLE_VAL_TO_TAKE_A_BREAK_FROM_TAKE_A_BREAK) {
            return;
          }

          if (this.isShown) {
            const durationStr = ParseDuration.toString($localStorage.currentSession.timeWorkedWithoutBreak);
            const message = $localStorage.config && $localStorage.config.takeABreakMessage && $localStorage.config.takeABreakMessage.replace(/\$\{duration\}/gi, durationStr);

            let toast = $mdToast.simple()
              .textContent(message)
              .action('I already did!')
              .hideDelay(20000)
              .position('bottom');
            $mdToast.show(toast).then(function (response) {
              if (response === 'ok') {
                // re-add task on undo
                $localStorage.currentSession.timeWorkedWithoutBreak = undefined;
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
