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
      'LocalStorageModule'
    ])
    .config(initLocalStorage);

  function initLocalStorage(localStorageServiceProvider) {
    localStorageServiceProvider
      .setPrefix('superProductivity');
  }
})();
