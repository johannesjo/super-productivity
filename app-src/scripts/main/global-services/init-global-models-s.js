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
  function InitGlobalModels(DEFAULT_THEME, AppStorage, $rootScope, $state, Tasks, ON_DEMAND_LS_FIELDS, ON_DEMAND_LS_FIELDS_FOR_PROJECT) {

    function getLsData(fromObj) {
      const toObj = {};
      _.forOwn(fromObj, (val, prop) => {
        //if (prop === 'projects') {
        //  toObj.projects = [];
        //  _.each(fromObj.projects, (project) => {
        //    let copyProject = {};
        //    _.forOwn(project, (val, prop) => {
        //      if (!angular.isFunction(val) && ON_DEMAND_LS_FIELDS_FOR_PROJECT.indexOf(prop) === -1) {
        //        copyProject[prop] = project[prop];
        //      }
        //    });
        //  });
        //} else
        //
        if (!angular.isFunction(val) && ON_DEMAND_LS_FIELDS.indexOf(prop) === -1) {
          toObj[prop] = fromObj[prop];
        }
      });

      return toObj;
    }

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
      $rootScope.r.currentSession = {};
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
    };
  }

})();
