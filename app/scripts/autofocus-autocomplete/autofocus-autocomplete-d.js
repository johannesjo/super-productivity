/**
 * @ngdoc directive
 * @name superProductivity.directive:autofocusAutocomplete
 * @description
 * # autofocusAutocomplete
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('autofocusAutocomplete', autofocusAutocomplete);

  /* @ngInject */
  function autofocusAutocomplete($timeout) {
    return {
      link: linkFn,
      restrict: 'A'
    };

    function linkFn(scope, element) {
      const FOCUS_DELAY = 30;
      let focusDelayTimeout = $timeout(() => {
        let inputEl = element.find('input');
        inputEl.focus();
      }, FOCUS_DELAY);

      scope.$on('$destroy', () => {
        $timeout.cancel(focusDelayTimeout);
      });
    }
  }

})();
