/**
 * @ngdoc filter
 * @name superProductivity.filter:numberToMonth
 * @function
 * @description
 * # numberToMonth
 * Filter in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .filter('numberToMonth', numberToMonth);

  const MAP = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  function numberToMonth() {
    return (number) => {
      return MAP[parseInt(number, 10) - 1];
    };
  }
})();
