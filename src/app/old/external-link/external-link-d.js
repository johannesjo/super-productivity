/**
 * @ngdoc directive
 * @name superProductivity.directive:externalLink
 * @description
 * # externalLink
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .directive('externalLink', externalLink);

  /* @ngInject */
  function externalLink(Util, IS_ELECTRON, SimpleToast) {
    return {
      link: linkFn,
      restrict: 'A',
      scope: {}
    };

    function linkFn(scope, element, attrs) {
      if (IS_ELECTRON) {
        element.on('click', (event) => {
          event.preventDefault();
          if (!attrs.type || attrs.type === 'LINK') {
            Util.openExternalUrl(element.attr('href'));
          } else if (attrs.type === 'FILE') {
            //const shell = require('electron').shell;
            //shell.openItem(attrs.href);
          } else if (attrs.type === 'COMMAND') {
            //const exec = require('child_process').exec;

            //SimpleToast('CUSTOM', `Running "${attrs.href}".`, 'laptop_windows');
            //
            //exec(attrs.href, (error) => {
            //  if (error) {
            //    SimpleToast('ERROR', `"${attrs.href}: ${error}`);
            //  }
            //});
          }
        });
      }
    }
  }
})();
