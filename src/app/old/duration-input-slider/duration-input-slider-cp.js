/**
 * @ngdoc component
 * @name superProductivity.component:durationInputSlider
 * @description
 * # durationInputSlider
 */
import moment from 'moment';
(() => {
  'use strict';

  class DurationInputSliderCtrl {
    /* @ngInject */
    constructor(ParseDuration, $element, $scope, Uid) {
      const el = $element[0];
      this.el = el;
      this.$scope = $scope;
      this.minutesBefore = 0;
      this.dots = undefined;
      this.uid = 'duration-input-slider' + Uid();
    }

    onChangeValue() {
      this.setRotationFromValue();
    }

    $onInit() {
      this.circle = this.el.querySelector('.handle-wrapper');

      this.startHandler = (ev) => {
        // don't execute when clicked on label or input
        if (ev.target.tagName === 'LABEL' || ev.target.tagName === 'INPUT') {
          this.endHandler();
          return;
        }

        this.el.addEventListener('mousemove', this.moveHandler);
        document.addEventListener('mouseup', this.endHandler);

        this.el.addEventListener('touchmove', this.moveHandler);
        document.addEventListener('touchend', this.endHandler);

        this.el.classList.add('is-dragging');
      };

      this.moveHandler = (ev) => {
        if (ev.type === 'click' &&
          ev.target.tagName === 'LABEL' ||
          ev.target.tagName === 'INPUT') {
          return;
        }

        // prevent touchmove
        ev.preventDefault();

        function convertThetaToCssDegrees(theta) {
          return 90 - theta;
        }

        const centerX = this.circle.offsetWidth / 2;
        const centerY = this.circle.offsetHeight / 2;

        let offsetX;

        let offsetY;
        if (ev.type === 'touchmove') {
          const rect = ev.target.getBoundingClientRect();
          offsetX = ev.targetTouches[0].pageX - rect.left;
          offsetY = ev.targetTouches[0].pageY - rect.top;
        } else {
          offsetX = ev.offsetX;
          offsetY = ev.offsetY;
        }

        const x = offsetX - centerX;
        const y = -1 * (offsetY - centerY);

        const theta = Math.atan2(y, x) * (180 / Math.PI);

        const cssDegrees = parseInt(convertThetaToCssDegrees(theta), 10);

        this.setValueFromRotation(cssDegrees);
      };

      this.endHandler = () => {
        this.el.classList.remove('is-dragging');
        this.el.removeEventListener('mousemove', this.moveHandler);
        document.removeEventListener('mouseup', this.endHandler);

        this.el.removeEventListener('touchmove', this.moveHandler);
        document.removeEventListener('touchend', this.endHandler);
      };

      this.el.addEventListener('mousedown', this.startHandler);
      this.el.addEventListener('touchstart', this.startHandler);

      this.el.addEventListener('click', this.moveHandler);

      this.setRotationFromValue();
    }

    $onDestroy() {
      // remove mouse events
      this.el.removeEventListener('mousedown', this.startHandler);
      this.el.removeEventListener('mousemove', this.moveHandler);
      document.removeEventListener('mouseup', this.endHandler);

      // remove touch events
      this.el.removeEventListener('touchstart', this.startHandler);
      this.el.removeEventListener('touchmove', this.moveHandler);
      document.removeEventListener('touchend', this.endHandler);
    }

    setCircleRotation(cssDegrees) {
      this.circle.style.transform = 'rotate(' + cssDegrees + 'deg)';
    }

    setDots(hours) {
      if (hours > 12) {
        hours = 12;
      }
      this.dots = new Array(hours);
    }

    setValueFromRotation(degrees) {
      let minutesFromDegrees;
      // NOTE: values are negative for the last quadrant
      if (degrees >= 0) {
        minutesFromDegrees = (degrees / 360 * 60);
      } else {
        minutesFromDegrees = ((degrees + 360) / 360 * 60);
      }

      minutesFromDegrees = parseInt(minutesFromDegrees, 10);
      //// should be 5 min values
      // minutesFromDegrees = Math.round(minutesFromDegrees / 5) * 5;

      let hours = Math.floor(moment.duration(this.ngModel).asHours());

      const minuteDelta = minutesFromDegrees - this.minutesBefore;
      const threshold = 40;
      if (minuteDelta > threshold) {
        hours--;
      } else if (-1 * minuteDelta > threshold) {
        hours++;
      }

      if (hours < 0) {
        hours = 0;
        minutesFromDegrees = 0;
        this.setCircleRotation(0);
      } else {
        this.setCircleRotation(degrees);
      }

      this.minutesBefore = minutesFromDegrees;
      this.setDots(hours);
      this.$scope.$evalAsync(() => {
        this.ngModel = moment.duration({
          hours: hours,
          minutes: minutesFromDegrees
        });
      });
    }

    setRotationFromValue() {
      const momentVal = moment.duration(this.ngModel);
      const minutes = momentVal.minutes();
      this.setDots(Math.floor(momentVal.asHours()));
      const degrees = minutes * 360 / 60;
      this.minutesBefore = minutes;
      this.setCircleRotation(degrees);
    }
  }

  angular
    .module('superProductivity')
    .component('durationInputSlider', {
      template: require('./duration-input-slider-cp.html'),
      controller: DurationInputSliderCtrl,
      controllerAs: '$ctrl',
      bindings: {
        ngModel: '=',
        label: '@',
      },
      require: { $ngModelCtrl: '^ngModel' }
    });

  // hacky fix for ff
  DurationInputSliderCtrl.$$ngIsClass = true;
})();
