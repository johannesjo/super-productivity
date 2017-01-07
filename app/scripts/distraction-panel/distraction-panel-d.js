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
  function DistractionPanelCtrl($rootScope) {
    let vm = this;
    vm.r = $rootScope.r;
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
      if (ev.ctrlKey && ev.keyCode === 27) {
        // escape is pressed
        vm.close();
      }
    };

    vm.saveDistraction = () => {
      $rootScope.r.distractions.push(vm.newDistraction);
      vm.close();
    };

  }

})();
