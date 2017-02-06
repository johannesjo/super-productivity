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
  function InlineMarkdownCtrl($timeout, $element, IS_ELECTRON, $scope) {
    let vm = this;
    let waitForMarkedTimeOut;

    const keypressHandler = ($event) => {
      if ($event.keyCode === 10 && $event.ctrlKey) {
        vm.untoggleShowEdit();
      }
    };

    function makeLinksWorkForElectron() {
      if (IS_ELECTRON) {
        const shell = require('electron').shell;
        const links = $element.find('a');

        links.on('click', (event) => {
          let url = angular.element(event.target).attr('href');

          if (!/^https?:\/\//i.test(url)) {
            url = 'http://' + url;
          }
          event.preventDefault();
          shell.openExternal(url);
        });
      }
    }

    if (IS_ELECTRON) {
      waitForMarkedTimeOut = $timeout(() => {
        makeLinksWorkForElectron();
      });
    }

    vm.toggleShowEdit = ($event) => {
      // check if anchor link was clicked
      if ($event.target.tagName !== 'A') {
        vm.showEdit = true;
        vm.ngModelCopy = angular.copy(vm.ngModel);

        $timeout(function () {
          const textareaEl = angular.element($element.find('textarea'));
          textareaEl[0].focus();
          textareaEl.on('keypress', keypressHandler);

          textareaEl.on('$destroy', () => {
            textareaEl.off('keypress', keypressHandler);
          });
        });
      }
    };

    vm.untoggleShowEdit = () => {
      vm.showEdit = false;
      makeLinksWorkForElectron();
      if (vm.ngModelCopy !== vm.ngModel) {
        vm.ngModel = vm.ngModelCopy;
        if (angular.isFunction(vm.onChanged)) {
          vm.onChanged();
        }
      }
    };

    $scope.$on('$destroy', () => {
      if (waitForMarkedTimeOut) {
        $timeout.cancel(waitForMarkedTimeOut);
      }
    });
  }

})();
