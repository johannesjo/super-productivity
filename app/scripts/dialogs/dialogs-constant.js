/**
 * @ngdoc constant
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Constant in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .constant('DIALOGS', {
      DEFAULTS: {
        clickOutsideToClose: true,
        controllerAs: 'vm',
        bindToController: true
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
