/**
 * @ngdoc directive
 * @name superProductivity.directive:inputDuration
 * @description
 * # inputDuration
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('inputDuration', inputDuration);

  /* @ngInject */
  function inputDuration(ParseDuration) {
    return {
      bindToController: true,
      controllerAs: 'vm',
      link: linkFn,
      restrict: 'A',
      require: 'ngModel'
    };

    function linkFn(scope, element, attrs, ngModelCtrl) {
      // format to duration model
      ngModelCtrl.$parsers.push((strValue) => {
        let momentVal = ParseDuration.fromString(strValue);
        let isValid = !!momentVal;

        ngModelCtrl.$setValidity('inputDuration', !!momentVal);

        // should be valid for optional
        if (!isValid && (attrs.inputDuration === 'optional' && strValue.trim().length <= 1)) {
          isValid = true;
          // should be undefined nevertheless
          momentVal = undefined;
        }

        return isValid ? momentVal : undefined;
      });

      // format to display
      ngModelCtrl.$formatters.push((value) => {
        return ParseDuration.toString(value);
      });
    }
  }

})();
