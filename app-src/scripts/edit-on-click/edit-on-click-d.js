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

  function getCaretPosition(editableDiv) {
    let caretPos = 0;
    let sel;
    let range;

    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.rangeCount) {
        range = sel.getRangeAt(0);
        if (range.commonAncestorContainer.parentNode == editableDiv) {
          caretPos = range.endOffset;
        }
      }
      return caretPos;
    } else {
      throw new Error('no window.getSelection :(')
    }
  }

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
      lastVal = removeTags(el.html());
    });

    el[0].setAttribute('contenteditable', true);

    function execCb(event) {
      // deselect all text
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
      else if (document.selection) {
        document.selection.empty();
      }

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
      curVal = removeTags(curVal);

      const isChanged = lastVal !== curVal;

      if (isChanged) {
        ngModel.$setViewValue(curVal);
        lastVal = curVal;
      }
    }

    ngModel.$render = () => {
      let html = ngModel.$viewValue || '';
      // strip tags
      html = removeTags(html);
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

    el[0].onpaste = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const text = ev.clipboardData.getData('text/plain')
        .trim();
      insertAtCursor(el[0], text);
      scope.$apply(read);
    };

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
