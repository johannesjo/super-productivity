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
  function NotesCtrl($mdDialog, $localStorage, theme) {
    if (!$localStorage.note) {
      $localStorage.note = 'write some note';
    }
    this.r = $localStorage;
    this.theme = theme;

    this.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
