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
      template: require('./hint-d.html'),
      bindToController: true,
      controller: HintCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function HintCtrl($rootScope) {
    let vm = this;

    vm.deleteHint = () => {
      if ($rootScope.r.tomorrowsNote) {
        delete $rootScope.r.tomorrowsNote;
      }
    };
  }

})();
