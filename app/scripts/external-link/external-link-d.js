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
  function externalLink(IS_ELECTRON) {
    return {
      link: linkFn,
      restrict: 'A',
      scope: {}
    };

    function linkFn(scope, element) {
      if (IS_ELECTRON) {
        const shell = require('electron').shell;
        element.on('click', (event) => {
          event.preventDefault();
          shell.openExternal(element.attr('href'));
        });
      }
    }
  }
})();
