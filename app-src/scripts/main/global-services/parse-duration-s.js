/**
 * @ngdoc service
 * @name superProductivity.ParseDuration
 * @description
 * # ParseDuration
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('ParseDuration', ParseDuration);

  /* @ngInject */
  function ParseDuration($window) {

    const moment = $window.moment;
    const _ = $window._;

    this.fromString = (strValue) => {
      let days;
      let hours;
      let minutes;
      let seconds;
      let momentVal;
      let isValid;
      let arrValue = strValue.split(' ');

      _.each(arrValue, (val) => {
        if (val.length > 0) {
          let lastChar = val.slice(-1);
          let amount = parseInt(val.slice(0, val.length - 1));

          if (lastChar === 's') {
            seconds = amount;
          }
          if (lastChar === 'm') {
            minutes = amount;
          }
          if (lastChar === 'h') {
            hours = amount;
          }
          if (lastChar === 'd') {
            days = amount;
          }
        }
      });
      isValid = seconds || minutes || hours || days || false;

      if (isValid) {
        momentVal = moment.duration({
          days: days,
          hours: hours,
          minutes: minutes,
          seconds: seconds,
        });

        if (momentVal.asSeconds() > 0) {
          return momentVal;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    };

    this.toString = (value) => {
      let val = angular.copy(value);
      if (val) {
        // if moment duration object
        if (val.duration || val._milliseconds) {

          let durationData = val.duration && val.duration()._data || val._data;
          const days = parseInt(durationData.days, 10);
          const hours = parseInt(durationData.hours, 10);
          const minutes = parseInt(durationData.minutes, 10);
          const seconds = parseInt(durationData.seconds, 10);

          val = '';
          val += (days > 0) && days + 'd ' || '';
          val += (hours > 0) && hours + 'h ' || '';
          val += (minutes > 0) && minutes + 'm ' || '';
          val += (seconds > 0) && seconds + 's ' || '';
          val = val.trim();
        }

        // if moment duration string
        else if (val.replace) {
          val = val.replace('PT', '');
          val = val.toLowerCase(val);
          val = val.replace(/(d|h|m|s)/g, '$1 ');
          // replace comma values
          val = val.replace(/\.\d+/g, '');
          val = val.trim();
        }
      }
      return val;
    };
  }

})();
