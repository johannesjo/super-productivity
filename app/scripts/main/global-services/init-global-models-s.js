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
  function InitGlobalModels(LS_DEFAULTS, DEFAULT_THEME, $rootScope, Tasks, $localStorage, Projects, $state) {
    return () => {
      $localStorage.$default(LS_DEFAULTS);

      // we don't use r.$state because it looks more like something special
      // this way
      $rootScope.$state = $state;

      $rootScope.r = {};

      $rootScope.r.projects = Projects.getList();

      $rootScope.r.tasks = Tasks.getToday();
      $rootScope.r.backlogTasks = Tasks.getBacklog();
      $rootScope.r.currentTask = Tasks.getCurrent();
      $rootScope.r.doneBacklogTasks = Tasks.getDoneBacklog();

      $rootScope.r.currentSession = $localStorage.currentSession;
      // reset after for every start
      $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;

      $rootScope.r.distractions = $localStorage.distractions;

      $rootScope.r.jiraSettings = $localStorage.jiraSettings;

      $rootScope.r.tomorrowsNote = $localStorage.tomorrowsNote;

      $rootScope.r.git = $localStorage.git;

      $rootScope.r.theme = $localStorage.theme || DEFAULT_THEME;

      if ($rootScope.r.theme.indexOf('dark') > -1) {
        $rootScope.r.bodyClass = 'dark-theme';
      } else {
        $rootScope.r.bodyClass = '';
      }

      // needs to be last for the updates from current data via the watcher!!!
      $rootScope.r.currentProject = Projects.getAndUpdateCurrent();
    }
  }

})();
