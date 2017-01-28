/**
 * @ngdoc directive
 * @name superProductivity.directive:distractionPanel
 * @description
 * # distractionPanel
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('distractionPanel', distractionPanel);

  /* @ngInject */
  function distractionPanel() {
    return {
      templateUrl: 'scripts/distraction-panel/distraction-panel-d.html',
      bindToController: true,
      controller: DistractionPanelCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        distractions: '='
      }
    };

  }

  /* @ngInject */
  function DistractionPanelCtrl($localStorage) {
    let vm = this;
    vm.r = $localStorage;
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
      vm.close();
    };

  }

})();
