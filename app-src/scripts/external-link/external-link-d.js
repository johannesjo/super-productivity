/**
 * @ngdoc directive
 * @name superProductivity.directive:externalLink
 * @description
 * # externalLink
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('externalLink', externalLink);

  /* @ngInject */
  function externalLink(Util, IS_ELECTRON) {
    return {
      link: linkFn,
      restrict: 'A',
      scope: {}
    };

    function linkFn(scope, element) {
      if (IS_ELECTRON) {
        element.on('click', (event) => {
          event.preventDefault();
          Util.openExternalUrl(element.attr('href'));
        });
      }
    }
  }
})();
