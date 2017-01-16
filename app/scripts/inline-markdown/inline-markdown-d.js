/**
 * @ngdoc directive
 * @name superProductivity.directive:inlineMarkdown
 * @description
 * # inlineMarkdown
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('inlineMarkdown', inlineMarkdown);

  /* @ngInject */
  function inlineMarkdown() {
    return {
      templateUrl: 'scripts/inline-markdown/inline-markdown-d.html',
      bindToController: true,
      controller: InlineMarkdownCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        ngModel: '=',
        onChanged: '&'
      }
    };
  }

  /* @ngInject */
  function InlineMarkdownCtrl($timeout, $element) {
    let vm = this;
    let prevModel
    let textareaEl = angular.element($element.find('textarea'));
    //let previewEl = angular.element($element.find('div'));

    vm.toggleShowEdit = () => {
      //console.log('set text', previewEl[0].offsetHeight);
      //
      ////textareaEl.css('height', previewEl[0].offsetHeight);
      //textareaEl[0].height = previewEl[0].offsetHeight;

      vm.showEdit = true;
      prevModel = vm.ngModel;
      $timeout(function () {
        textareaEl[0].focus();
      });
    };

    vm.untoggleShowEdit = () => {
      //console.log('set preview', textareaEl[0].offsetHeight);

      //previewEl.css('height', textareaEl[0].offsetHeight);
      //previewEl[0].height = textareaEl[0].offsetHeight;
      vm.showEdit = false;
      if (angular.isFunction(vm.onChanged)) {
        if (prevModel !== vm.ngModel) {
          vm.onChanged();
        }
      }
    };
  }

})();
