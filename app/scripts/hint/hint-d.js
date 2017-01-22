/**
 * @ngdoc directive
 * @name superProductivity.directive:hint
 * @description
 * # hint
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('hint', hint);

  /* @ngInject */
  function hint() {
    return {
      templateUrl: 'scripts/hint/hint-d.html',
      bindToController: true,
      controller: HintCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      transclude: true,
      scope: {
        title: '@',
        subTitle: '@'
      }
    };
  }

  /* @ngInject */
  function HintCtrl($localStorage) {
    let vm = this;

    vm.hide = false;

    vm.removeHint = () => {
      vm.hide = true;
      //$element.remove();
    };

    vm.deleteHint = () => {
      vm.hide = true;
      console.log($localStorage.tomorrowsNote);

      if ($localStorage.tomorrowsNote) {
        delete $localStorage.tomorrowsNote;
      }
    };
  }

})();
