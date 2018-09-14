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
    .filter('formatMillisecondsCounter', duration);

  function duration($window) {
    return function(input) {
      return $window.moment.duration(input, 'milliseconds').format('hh:mm:ss');

    };
  }
})();
