/**
 * @ngdoc directive
 * @name superProductivity.directive:inputDuration
 * @description
 * # inputDuration
 */

(function() {
  'use strict';

  angular
      .module('superProductivity')
      .directive('inputDuration', inputDuration);

  /* @ngInject */
  function inputDuration() {
    return {
        bindToController: true,
        controller: InputDurationCtrl,
        controllerAs: 'vm',
        link: linkFn,
        restrict: 'A',
        scope: {

        }
      };

    function linkFn(scope, element, attrs) {

    }
  }

  /* @ngInject */
  function InputDurationCtrl() {
    var vm = this;
  }

})();
