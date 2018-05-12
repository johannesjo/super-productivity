/**
 * @ngdoc service
 * @name superProductivity.InitGlobalModels
 * @description
 * # InitGlobalModels
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('InitGlobalModels', InitGlobalModels);

  /* @ngInject */
  function InitGlobalModels(DEFAULT_THEME, $rootScope, $state, Tasks, PomodoroButton, LS_DEFAULTS) {
    return () => {

      // we don't use r.$state because it looks more like something special
      // this way
      $rootScope.$state = $state;

      // we want the current task to be a reference to the tasks array
      // that's why we need to reassign
      $rootScope.r.currentTask = $rootScope.r.currentTask = Tasks.getCurrent();
      if ($rootScope.r.currentTask) {
        Tasks.updateCurrent($rootScope.r.currentTask);
      }

      // reset session
      $rootScope.r.currentSession = angular.copy(LS_DEFAULTS.currentSession);
      $rootScope.r.theme = $rootScope.r.theme = $rootScope.r.theme || DEFAULT_THEME;

      if ($rootScope.r.theme && $rootScope.r.theme.indexOf('dark') > -1) {
        $rootScope.r.bodyClass = 'dark-theme';
      } else {
        $rootScope.r.bodyClass = '';
      }

      // all of these should normally not happen, but in case it does, at least
      // assign an object save the chosen values
      if (!$rootScope.r.uiHelper.dailyTaskExportSettings) {
        $rootScope.r.uiHelper.dailyTaskExportSettings = {};
      }
      if (!$rootScope.r.uiHelper.timeTrackingHistoryExportSettings) {
        $rootScope.r.uiHelper.timeTrackingHistoryExportSettings = {};
      }
      if (!$rootScope.r.uiHelper.csvExportSettings) {
        $rootScope.r.uiHelper.csvExportSettings = {};
      }

      PomodoroButton.reInit();
    };
  }

})();
