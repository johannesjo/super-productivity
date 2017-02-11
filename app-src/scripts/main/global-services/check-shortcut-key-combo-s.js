/**
 * @ngdoc service
 * @name superProductivity.CheckShortcutKeyCombo
 * @description
 * # CheckShortcutKeyCombo
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('CheckShortcutKeyCombo', CheckShortcutKeyCombo);

  /* @ngInject */
  function CheckShortcutKeyCombo() {
    return (ev, comboToTest) => {
      if (comboToTest) {
        let isConditionMatched = true;
        const comboKeys = comboToTest.split('+');
        const standardKey = comboKeys[comboKeys.length - 1];
        const specialKeys = angular.copy(comboKeys);
        specialKeys.splice(-1, 1);

        isConditionMatched = isConditionMatched && (!(specialKeys.indexOf('Ctrl') > -1) || ev.ctrlKey === true);
        isConditionMatched = isConditionMatched && (!(specialKeys.indexOf('Alt') > -1) || ev.altKey === true);
        isConditionMatched = isConditionMatched && (!(specialKeys.indexOf('Shift') > -1) || ev.shiftKey === true);
        isConditionMatched = isConditionMatched && ev.key === standardKey;

        return isConditionMatched;
      }
    };
  }

})();
