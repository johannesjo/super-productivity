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
      const modelGetter = $parse(attrs['ngModel']);
      const modelSetter = modelGetter.assign;

      let prevVal = modelGetter(scope);

      element.on('keydown', ($event) => {
        $event.preventDefault();
        $event.stopPropagation();
        //console.log($event);
        //console.log(ngModelCtrl.$modelValue);
        //console.log(attrs);

        // focus out on escape
        if ($event.keyCode === 27 || $event.key === 'Escape') {
          modelSetter(scope, prevVal);
          element.blur();
        }
        else {
          if (attrs.keyboardKeyInputControlKeys) {
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
            modelSetter(scope, val + $event.key);
          }
          else {
            modelSetter(scope, $event.key);
          }
        }
        scope.$apply();
      });
    }
  }
})();
