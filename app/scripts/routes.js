/**
 * @ngdoc overview
 * @name superProductivity.routes
 * @description
 * # superProductivity.routes
 *
 * Routes module. All app states are defined here.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .config(routerHelperProvider);

  /* @ngInject */
  function routerHelperProvider($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url: '/',
        template: '<daily-planner></daily-planner>'
      })
    /* STATES-NEEDLE - DO NOT REMOVE THIS */;
  }
})();
