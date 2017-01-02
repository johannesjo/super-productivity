/**
 * @ngdoc constant
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Constant in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .constant('DIALOGS', {
      DEFAULTS: {
        clickOutsideToClose: true,
        controllerAs: 'vm',
        bindToController: true
      },
      CREATE_TASK: {
        title: 'Out of undone tasks',
        textContent: 'You run out of tasks. Go on and create some new ones if you like.',
        ok: 'Got it!'
      },
      TASK_SELECTION: {
        controller: 'TaskSelectionCtrl',
        templateUrl: 'scripts/dialogs/task-selection/task-selection-c.html'
      },
      TIME_ESTIMATE: {
        controller: 'TimeEstimateCtrl',
        templateUrl: 'scripts/dialogs/time-estimate/time-estimate-c.html'
      }
    });
})();
