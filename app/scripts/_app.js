/**
 * @ngdoc overview
 * @name superProductivity
 * @description
 * # superProductivity
 *
 * Main module of the application.
 */

(function() {
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
    .run(checkIfStartedTodayAndInit);

  function initGlobalTaskModel(Tasks, $rootScope) {
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
  }

  function checkIfStartedTodayAndInit() {
  }

})();
