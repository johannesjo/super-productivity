/**
 * @ngdoc filter
 * @name superProductivity.filter:duration
 * @function
 * @description
 * # duration
 * Filter in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .filter('duration', duration);

  function duration($window) {
    const DEFAULT_RETURN_VAL = '-';

    return function(input, longWords) {
      if (!input) {
        return DEFAULT_RETURN_VAL;
      }

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
          let minutes = input._data.minutes;
          if (input._data.seconds > 29) {
            minutes++;
          }
          output += minutes + 'm ';
        }
        if (output.length === 0) {
          output = DEFAULT_RETURN_VAL;
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
          let minutes = input._data.minutes;
          if (input._data.seconds > 29) {
            minutes++;
          }
          output += minutes + ' minutes ';
        }
        if (output.length === 0) {
          output = DEFAULT_RETURN_VAL;
        }
      }

      return output.trim();
    };
  }
})();
