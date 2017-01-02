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
      'dndLists',
      'ngMaterial',
      'ngMdIcons',
      'angularMoment'
    ])
    .run(checkIfStartedTodayAndInit);

  function checkIfStartedTodayAndInit() {
  }

})();
