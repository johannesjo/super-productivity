/**
 * @ngdoc directive
 * @name superProductivity.directive:editOnClick
 * @description
 * # editOnClick
 */

(function() {
  'use strict';

  // HELPER
  // -----------------------------------
  function insertAtCursor(el, newText) {
    const sel = window.getSelection();

    const start = sel.anchorOffset;
    const end = sel.focusOffset;
    const text = el.innerText;

    const textBefore = text.substring(0, start);
    const textAfter = text.substring(end, text.length);

    const completeTextAfterInsert = (textBefore + newText + textAfter).trim();

    el.innerText = completeTextAfterInsert;

    // reset caret to proper offset
    const range = document.createRange();
    range.setStart(el.childNodes[0], start + newText.length);
    range.collapse(true);
    const sel2 = window.getSelection();

    sel2.removeAllRanges();
    sel2.addRange(range);
  }

  function removeTags(str) {
    return str.replace(/<\/?[^`]+?\/?>/gmi, '\n') //replace all tags
      .replace(/\n/gmi, '') // replace line breaks
      .replace(/&nbsp;/gmi, '') // replace line breaks
      .trim();
  }

  angular
    .module('superProductivity')
    .constant('EDIT_ON_CLICK_TOGGLE_EV', 'EDIT_ON_CLICK_TOGGLE_EV')
    .directive('editOnClick', editOnClick);

  let EV_NAME;
  let mdxSvc;

  /* @ngInject */
  function editOnClick(EDIT_ON_CLICK_TOGGLE_EV, mdx) {
    EV_NAME = EDIT_ON_CLICK_TOGGLE_EV;
    mdxSvc = mdx;

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
    scope.$evalAsync(() => {
      lastVal = removeTags(el.html());
    });

    // ideally we set the attribute manually to minimize performance loss
    if (!(el[0].getAttribute('contenteditable'))) {
      el[0].setAttribute('contenteditable', true);
    }

    function execCb(event) {
      // deselect all text
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
      else if (document.selection) {
        document.selection.empty();
      }

      const curVal = el.html();
      const isChanged = (lastVal !== curVal);

      if (angular.isFunction(scope.editOnClickOnEditFinished)) {
        scope.editOnClickOnEditFinished({
          isChanged,
          newVal: curVal,
          $taskEl: el[0].closest('.task'),
          event,
        });
      }
      lastVal = curVal;
    }

    function read() {
      let curVal = el.html();
      // strip tags
      curVal = removeTags(curVal);
      ngModel.$setViewValue(curVal);
    }

    ngModel.$render = () => {
      let html = ngModel.$viewValue || '';
      // strip tags
      html = removeTags(html);
      el.html(html);
    };

    el.bind('input', () => {
      scope.$evalAsync(read);
    });

    el.bind('blur', (ev) => {
      el[0].style.borderColor = '';
      scope.$evalAsync(read);
      execCb(ev);
    });

    el.bind('focus', () => {
      mdxSvc.setRGB(el, 'border-color', mdxSvc, 'primary', 'editOnClick');
    });

    // prevent keyboard shortcuts from firing when here
    el[0].addEventListener('keydown', (ev) => {
      ev.stopPropagation();

      // also blur on escape
      if (ev.keyCode === 13 || ev.keyCode === 27) {
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    // blur on enter
    el[0].addEventListener('keypress', function(ev) {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        setTimeout(() => {
          el.blur();
        });
      }
    });

    el[0].onpaste = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const text = ev.clipboardData.getData('text/plain')
        .trim();
      insertAtCursor(el[0], text);
      scope.$evalAsync(read);
    };

    function clickToggleEvHandler(ev, eventId) {
      if (eventId === scope.editOnClickEvId) {
        setTimeout(() => {
          el.focus();
          // we need another timeout to prevent buggy chrome behaviour
          setTimeout(() => {
            // select all when doing this
            document.execCommand('selectAll', false, null);
          });
        });
      }
    }

    scope.$on(EV_NAME, clickToggleEvHandler);
  }
})();
