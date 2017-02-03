/**
 * @ngdoc service
 * @name superProductivity.InitGlobalModels
 * @description
 * # InitGlobalModels
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('InitGlobalModels', InitGlobalModels);

  /* @ngInject */
  function InitGlobalModels(DEFAULT_THEME, $rootScope, $localStorage, $state) {
    return () => {

      // we don't use r.$state because it looks more like something special
      // this way
      $rootScope.$state = $state;

      $rootScope.r = $localStorage;

      // reset session
      $localStorage.currentSession = {};
      $localStorage.theme = $localStorage.theme || DEFAULT_THEME;

      if ($rootScope.r.theme.indexOf('dark') > -1) {
        $rootScope.r.bodyClass = 'dark-theme';
      } else {
        $rootScope.r.bodyClass = '';
      }

      // all of these should normally not happen, but in case it does, at least
      // assign an object save the chosen values
      if (!$localStorage.uiHelper.dailyTaskExportSettings) {
        $localStorage.uiHelper.dailyTaskExportSettings = {};
      }
      if (!$localStorage.uiHelper.timeTrackingHistoryExportSettings) {
        $localStorage.uiHelper.timeTrackingHistoryExportSettings = {};
      }
      if (!$localStorage.uiHelper.csvExportSettings) {
        $localStorage.uiHelper.csvExportSettings = {};
      }
    };
  }

})();
