/**
 * @ngdoc directive
 * @name superProductivity.directive:textToFileDownload
 * @description
 * # textToFileDownload
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('textToFileDownload', textToFileDownload);

  /* @ngInject */
  function textToFileDownload() {
    return {
      link: linkFn,
      restrict: 'A',
      scope: {
        textToFileDownload: '=',
        fileName: '@'
      }
    };

    function linkFn(scope, element) {
      element.on('click', () => {
        const fileName = scope.fileName || moment().format('DD-MM-YYYY') + '-tasks.txt';

        let dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(scope.textToFileDownload);

        element[0].setAttribute('href', dataStr);
        element[0].setAttribute('download', fileName);
      });
    }
  }

})();
