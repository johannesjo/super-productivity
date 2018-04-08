/**
 * @ngdoc directive
 * @name superProductivity.directive:editOnClick
 * @description
 * # editOnClick
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .constant('EDIT_ON_CLICK_TOGGLE_EV', 'EDIT_ON_CLICK_TOGGLE_EV')
    .directive('editOnClick', editOnClick);

  let EV_NAME;

  /* @ngInject */
  function editOnClick(EDIT_ON_CLICK_TOGGLE_EV) {
    EV_NAME = EDIT_ON_CLICK_TOGGLE_EV;
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        editOnClickEvId: '<',
        editOnClickOnEditFinished: '&'
      },
      link: linkFn
    };
  }


  function linkFn(scope, el, attrs, ngModel) {
    let lastVal;
    // to do this better
    setTimeout(() => {
      lastVal = el.html().replace(/<\S[^><]*>/g, '');
    });

    el[0].setAttribute('contenteditable', true);

    function execCb(event) {
      // deselect all text
      //if (window.getSelection) {
      //  window.getSelection().removeAllRanges();
      //}
      //else if (document.selection) {
      //  document.selection.empty();
      //}

      const curVal = el.html();
      const isChanged = lastVal !== curVal;
      if (angular.isFunction(scope.editOnClickOnEditFinished)) {
        scope.editOnClickOnEditFinished({
          isChanged,
          newVal: curVal,
          $taskEl: el[0].closest('.task'),
          event,
        });
      }
    }

    function read() {
      let curVal = el.html();
      // strip tags
      curVal = curVal.replace(/<\S[^><]*>/g, '');

      const isChanged = lastVal !== curVal;
      console.log(curVal, lastVal, isChanged);

      if (isChanged) {
        ngModel.$setViewValue(curVal);
        lastVal = curVal;
      }
    }

    ngModel.$render = () => {
      let html = ngModel.$viewValue || '';
      // strip tags
      html = html.replace(/<\S[^><]*>/g, '');
      el.html(html);
    };

    el.bind('input', () => {
      scope.$apply(read);
    });

    el.bind('blur', (ev) => {
      scope.$apply(read);
      execCb(ev);
    });

    // prevent keyboard shortcuts from firing when here
    el[0].addEventListener('keydown', (ev) => {
      ev.stopPropagation();
    });

    // prevent enter key from firing here (but don't stop propagation)
    el[0].addEventListener('keypress', function(evt) {
      if (evt.which === 13) {
        evt.preventDefault();
        el.blur();
      }
    });

    function clickToggleEvHandler(ev, eventId) {
      if (eventId === scope.editOnClickEvId) {
        el.focus();
        setTimeout(() => {
          //document.execCommand('selectAll', false, null)
        });
      }
    }

    scope.$on(EV_NAME, clickToggleEvHandler);
  }
})();
