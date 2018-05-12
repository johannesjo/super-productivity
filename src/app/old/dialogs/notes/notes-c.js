/**
 * @ngdoc function
 * @name superProductivity.controller:NotesCtrl
 * @description
 * # NotesCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('NotesCtrl', NotesCtrl);

  /* @ngInject */
  function NotesCtrl($mdDialog, $rootScope, theme) {
    if (!$rootScope.r.note) {
      $rootScope.r.note = 'Write some notes';
    }
    this.r = $rootScope.r;
    this.theme = theme;

    this.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
