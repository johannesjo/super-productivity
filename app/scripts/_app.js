/**
 * @ngdoc overview
 * @name superProductivity
 * @description
 * # superProductivity
 *
 * Main module of the application.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity', [
      'ngAnimate',
      'ngAria',
      'ngResource',
      'ui.router',
      'ngStorage',
      'ngMaterial',
      'ngMdIcons',
      'as.sortable',
      'angularMoment'
    ])
    .config(configMdTheme)
    .run(initGlobalTaskModel)
    .run(initGlobalShortcuts)
    .run(showNoteForToday);

  function configMdTheme($mdThemingProvider) {
    $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
    $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
    $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
    $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();
  }

  function initGlobalTaskModel(Tasks, $rootScope, $localStorage) {
    $rootScope.r = {};

    $rootScope.r.tasks = Tasks.getToday();

    $rootScope.r.backlogTasks = Tasks.getBacklog();

    $rootScope.r.currentTask = Tasks.getCurrent();

    $rootScope.r.doneBacklogTasks = Tasks.getDoneBacklog();

    $rootScope.r.noteForToday = $localStorage.tomorrowsNote;
  }

  function showNoteForToday($rootScope, $mdToast) {
    if ($rootScope.r.noteForToday) {
      $mdToast.show(
        $mdToast.simple()
          .textContent('Your Note for Today: ' + $rootScope.r.noteForToday)
          .position('top left')
          .hideDelay(15000)
          .highlightAction(true)
      );
    }
  }

  function initGlobalShortcuts($document, Dialogs) {
    // we just use this single one as this usually does mess
    // up with the default browser shortcuts
    // better to use the global electron shortcuts here
    $document.bind('keypress', (ev) => {
      if (ev.key === '*') {
        Dialogs('ADD_TASK');
      }
    });
  }

})();
