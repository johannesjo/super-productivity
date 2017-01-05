/**
 * @ngdoc directive
 * @name superProductivity.directive:hints
 * @description
 * # hints
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('hints', hints);

  /* @ngInject */
  function hints() {
    return {
      templateUrl: 'scripts/hints/hints-d.html',
      bindToController: true,
      controller: HintsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };

  }

  /* @ngInject */
  function HintsCtrl() {
    //let vm = this;
  }

})();
