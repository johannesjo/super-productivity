/**
 * @ngdoc directive
 * @name superProductivity.directive:inlineMarkdown
 * @description
 * # inlineMarkdown
 */

(function() {
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
        onEditFinished: '&'
      }
    };
  }

  /* @ngInject */
  function InlineMarkdownCtrl($timeout, $element, IS_ELECTRON, $scope) {
    let vm = this;
    let waitForMarkedTimeOut;
    let textareaEl;
    let ngModelCopy;
    let textareaTimeout;
    const wrapperEl = $element.children();

    const onKeypress = ($event) => {
      // close on str+enter
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

    function onKeyDown(ev) {
      ev.stopPropagation();

      // also untoggle on escape key
      if (ev.keyCode === 27) {
        vm.untoggleShowEdit();
      }
    }

    if (IS_ELECTRON) {
      waitForMarkedTimeOut = $timeout(() => {
        makeLinksWorkForElectron();
      });
    }

    vm.toggleShowEdit = ($event) => {
      // check if anchor link was clicked
      if ($event && $event.target.tagName !== 'A') {
        vm.showEdit = true;
        ngModelCopy = vm.ngModel || '';

        textareaTimeout = $timeout(function() {
          textareaEl = angular.element($element.find('textarea'));
          textareaEl[0].value = ngModelCopy;
          textareaEl[0].focus();
          textareaEl.on('keypress', onKeypress);

          // prevent keyboard shortcuts from firing when here
          textareaEl.on('keydown', onKeyDown);

          textareaEl.on('$destroy', () => {
            textareaEl.off('keypress', onKeypress);
            textareaEl.off('keydown', onKeyDown);
          });
        });
      }

      wrapperEl.addClass('is-editing');
    };

    vm.toggleEditLock = ($event) => {
      vm.isLocked = !vm.isLocked;

      if (vm.isLocked) {
        $event.preventDefault();
        $event.stopPropagation();
      } else {
        vm.untoggleShowEdit();
      }
    };

    vm.untoggleShowEdit = () => {
      ngModelCopy = textareaEl[0].value;

      if (!vm.isLocked) {
        vm.showEdit = false;
        makeLinksWorkForElectron();
        vm.resizeToFit();
        wrapperEl.removeClass('is-editing');
      }

      const isChanged = (ngModelCopy !== vm.ngModel);

      if (isChanged) {
        vm.ngModel = ngModelCopy;
      }

      if (angular.isFunction(vm.onEditFinished)) {
        vm.onEditFinished({
          newVal: vm.ngModel,
          isChanged: isChanged
        });
      }
    };

    vm.resizeToFit = () => {
      $timeout(() => {
        const previewEl = angular.element($element.find('marked-preview'));
        const wrapperEl = angular.element($element.find('div')[0]);

        previewEl.css('height', 'auto');
        wrapperEl.css('height', previewEl[0].offsetHeight + 'px');
        previewEl.css('height', '');
      });
    };

    vm.resizeToFit();

    $scope.$on('$destroy', () => {
      if (waitForMarkedTimeOut) {
        $timeout.cancel(waitForMarkedTimeOut);
      }
      if (textareaTimeout) {
        $timeout.cancel(textareaTimeout);
      }
    });
  }

})();
