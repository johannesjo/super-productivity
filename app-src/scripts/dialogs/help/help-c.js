/**
 * @ngdoc function
 * @name superProductivity.controller:HelpCtrl
 * @description
 * # HelpCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('HelpCtrl', HelpCtrl);

  /* @ngInject */
  function HelpCtrl($mdDialog, theme, $state, IS_ELECTRON, template) {
    let vm = this;
    vm.task = {};
    vm.theme = theme;
    vm.IS_ELECTRON = IS_ELECTRON;

    if (template === 'PAGE') {
      vm.helpTpl = 'scripts/dialogs/help/help-' + $state.current.name + '.html';
    } else {
      vm.helpTpl = 'scripts/dialogs/help/help-' + template + '.html';
    }

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
