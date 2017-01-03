/**
 * @ngdoc filter
 * @name superProductivity.filter:duration
 * @function
 * @description
 * # duration
 * Filter in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .filter('duration', duration);

  function duration($window) {
    return function (input, longWords) {
      let output = '';
      input = $window.moment.duration(input);

      if (!longWords) {
        if (input._data.days) {
          output = input._data.days + 'd ';
        }
        if (input._data.hours) {
          output += input._data.hours + 'h ';
        }
        if (input._data.minutes) {
          output += input._data.minutes + 'm ';
        }
        if (output.length === 0) {
          output = '-';
        }
      } else {
        if (input._data.days) {
          output = input._data.days + ' days ';
        }
        if (input._data.hours) {
          output += input._data.hours + ' hours ';
        }
        if (input._data.minutes) {
          output += input._data.minutes + ' minutes ';
        }
        if (output.length === 0) {
          output = '-';
        }
      }

      return output.trim();
    };
  }
})();
