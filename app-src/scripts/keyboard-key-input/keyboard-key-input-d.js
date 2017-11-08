/**
 * @ngdoc directive
 * @name superProductivity.directive:keyboardKeyInput
 * @description
 * # keyboardKeyInput
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('keyboardKeyInput', keyboardKeyInput);

  /* @ngInject */
  function keyboardKeyInput($parse) {
    return {
      link: linkFn,
      restrict: 'A'
    };

    function linkFn(scope, element, attrs) {
      const modelGetter = $parse(attrs.ngModel);
      const modelSetter = modelGetter.assign;

      let prevVal = modelGetter(scope);

      element.on('keydown', ($event) => {
        // the tab key should continue to behave normally
        if ($event.keyCode === 9 || $event.key === 'Tab') {
          return;
        }

        $event.preventDefault();
        $event.stopPropagation();

        // focus out on escape
        if ($event.keyCode === 27 || $event.key === 'Escape') {
          modelSetter(scope, prevVal);
          element.blur();
        }
        else if ($event.keyCode === 13 || $event.key === 'Enter') {
          element.blur();
        }
        // don't update if event is for ctrl alt or shift down itself
        else if ($event.keyCode === 16 || $event.keyCode === 17 || $event.keyCode === 18) {
          return;
        }
        else {
          if (attrs.omitKeyboardKeyInputControlKeys) {
            modelSetter(scope, $event.key);
          }
          else {
            let val = '';
            if ($event.ctrlKey) {
              val += 'Ctrl+';
            }
            if ($event.altKey) {
              val += 'Alt+';
            }
            if ($event.shiftKey) {
              val += 'Shift+';
            }
            if ($event.metaKey) {
              val += 'Meta+';
            }

            // fail safe for MacOsX crashing bug
            if ($event.key === 'Meta') {
              modelSetter(scope, '');
            } else {
              modelSetter(scope, val + $event.key);
            }
          }
        }
        scope.$apply();
      });
    }
  }
})();
