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
      scope: true
    };
  }

  /* @ngInject */
  function HintCtrl($localStorage) {
    let vm = this;

    vm.deleteHint = () => {
      if ($localStorage.tomorrowsNote) {
        delete $localStorage.tomorrowsNote;
      }
    };
  }

})();
