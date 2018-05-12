/**
 * @ngdoc overview
 * @name superProductivity.routes
 * @description
 * # superProductivity.routes
 *
 * Routes module. All app states are defined here.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .config(routerHelperProvider);

  /* @ngInject */
  function routerHelperProvider($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('daily-planner', {
        url: '/',
        template: '<daily-planner></daily-planner>'
      })
      .state('work-view', {
        url: '/work-view',
        template: '<work-view></work-view>'
      })
      .state('settings', {
        url: '/settings',
        controller: 'SettingsCtrl',
        controllerAs: 'vm',
        template: require('./routes/settings/settings-c.html')
      })
      .state('daily-summary', {
        url: '/daily-summary',
        template: '<daily-summary></daily-summary>'
      })
      .state('done-tasks-backlog', {
        url: '/done-tasks-backlog',
        template: '<done-tasks-backlog></done-tasks-backlog>'
      })
      .state('focus-view', {
        url: '/focus-view',
        template: '<focus-view></focus-view>'
      })
      .state('agenda-and-history', {
        url: '/agenda-and-history',
        template: '<agenda-and-history></agenda-and-history>'
      })
      .state('time-tracking-history', {
        parent: 'agenda-and-history',
        url: '/time-tracking-history',
        template: '<time-tracking-history></time-tracking-history>'
      })
      .state('daily-agenda', {
        parent: 'agenda-and-history',
        url: '/daily-agenda',
        template: '<daily-agenda></daily-agenda>'
      })
    /* STATES-NEEDLE - DO NOT REMOVE THIS */;
  }
})();
