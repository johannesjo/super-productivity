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
      let dayHours = 0;

      // this would be correct but simply checking for an object is faster
      //if (!$window.moment.isDuration(input)) {
      if (!angular.isObject(input)) {
        input = $window.moment.duration(input);
      }

      if (!longWords) {
        if (input._data.days) {
          //output = input._data.days + ' d ';
          dayHours = input._data.hours + (input._data.days * 24);
        }
        if (input._data.hours) {
          output += input._data.hours + dayHours + 'h ';
        }
        if (input._data.minutes) {
          output += input._data.minutes + 'm ';
        }
        if (output.length === 0) {
          output = '-';
        }
      } else {
        if (input._data.days) {
          //output = input._data.days + ' days ';
          dayHours = input._data.hours + (input._data.days * 24);
        }
        if (input._data.hours) {
          output += input._data.hours + dayHours + ' hours ';
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
