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
      scope: {},
      replace: true
    };
  }

  /* @ngInject */
  function HintCtrl($element) {
    let vm = this;

    vm.removeHint = () => {
      $element.remove();
    };
  }

})();
