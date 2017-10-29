/**
 * @ngdoc function
 * @name superProductivity.controller:WelcomeCtrl
 * @description
 * # WelcomeCtrl
 * Controller of the superProductivity
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('WelcomeCtrl', WelcomeCtrl);

  /* @ngInject */
  function WelcomeCtrl($mdDialog, $localStorage, IS_ELECTRON, theme, Dialogs) {
    let vm = this;
    vm.theme = theme;

    vm.IS_ELECTRON = IS_ELECTRON;

    vm.isShowDialogAgain = $localStorage.uiHelper.isShowWelcomeDialog;

    vm.hideDialogChange = (isHide) => {
      $localStorage.uiHelper.isShowWelcomeDialog = !isHide;
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };

    vm.openHelp = (ev) => {
      ev.preventDefault();
      $mdDialog.cancel();
      Dialogs('HELP', { template: 'PAGE' });
    }
  }
})();
