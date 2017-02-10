/**
 * @ngdoc function
 * @name superProductivity.controller:DistractionsCtrl
 * @description
 * # DistractionsCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('DistractionsCtrl', DistractionsCtrl);

  /* @ngInject */
  function DistractionsCtrl($mdDialog, $localStorage, SimpleToast, theme) {
    let vm = this;
    vm.r = $localStorage;
    vm.theme = theme;
    vm.isOpen = false;

    vm.close = () => {
      vm.newDistraction = '';
      vm.isOpen = false;
    };

    vm.onKeydown = (ev) => {
      if (ev.ctrlKey && ev.keyCode === 13) {
        // Ctrl-Enter pressed
        vm.saveDistraction();
      }
      if (ev.keyCode === 27) {
        // escape is pressed
        vm.close();
      }
    };

    vm.saveDistraction = () => {
      if (vm.newDistraction.length > 0) {
        $localStorage.distractions.push(vm.newDistraction);
      }
      SimpleToast('SUCCESS', 'Distraction saved for later');
      $mdDialog.hide();
    };

    this.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
