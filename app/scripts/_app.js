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
    .run(initGlobalTaskModel)
    .run(showNoteForToday);

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
})();
