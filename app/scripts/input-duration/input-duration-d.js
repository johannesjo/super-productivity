/**
 * @ngdoc directive
 * @name superProductivity.directive:inputDuration
 * @description
 * # inputDuration
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('inputDuration', inputDuration);

  /* @ngInject */
  function inputDuration() {
    return {
      bindToController: true,
      controllerAs: 'vm',
      link: linkFn,
      restrict: 'A',
      require: 'ngModel'
    };

    function linkFn(scope, element, attrs, ngModelCtrl) {
      // format to duration model
      ngModelCtrl.$parsers.push((strValue) => {
        let days;
        let hours;
        let minutes;
        let seconds;
        let momentVal;
        let isValid;
        let arrValue = strValue.split(' ');

        for (var i = 0; i < arrValue.length; i++) {
          let val = arrValue[i];
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
        }

        isValid = seconds || minutes || hours || days;

        ngModelCtrl.$setValidity('inputDuration', !!isValid);

        if (isValid) {
          momentVal = moment.duration({
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
          });
        }
        return isValid ? momentVal : undefined;
      });

      // format to display
      ngModelCtrl.$formatters.push((value) => {
        let val = angular.copy(value);
        if (val) {
          // if moment duration object
          if (val.duration || val._milliseconds) {

            let durationData = val.duration && val.duration()._data || val._data;
            val = '';
            val += parseInt(durationData.days) > 0 && (durationData.days + 'd ') || '';
            val += parseInt(durationData.hours) > 0 && (durationData.hours + 'h ') || '';
            val += parseInt(durationData.minutes) > 0 && (durationData.minutes + 'm ') || '';
            val += parseInt(durationData.seconds) > 0 && (durationData.seconds + 's ') || '';
            val = val.trim();
          }

          // if moment duration string
          else if (val.replace) {
            val = val.replace('PT', '');
            val = val.toLowerCase(val);
            val = val.replace(/(d|h|m|s)/g, '$1 ');
            val = val.trim();
          }
        }

        return val;
      });
    }
  }

})();
