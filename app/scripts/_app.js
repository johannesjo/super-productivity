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

    Tasks.getToday().then((tasks) => {
      $rootScope.r.tasks = tasks;
    });

    Tasks.getBacklog().then((tasks) => {
      $rootScope.r.backlogTasks = tasks;
    });

    Tasks.getCurrent().then((task) => {
      $rootScope.r.currentTask = task;
    });

    Tasks.getDoneBacklog().then((task) => {
      $rootScope.r.doneBacklogTasks = task;
    });

    $rootScope.r.noteForToday = $localStorage.tomorrowsNote;
  }

  function showNoteForToday($rootScope, $mdToast) {
    console.log('I am here!', $rootScope.r.noteForToday);

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
