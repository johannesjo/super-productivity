/**
 * @ngdoc component
 * @name superProductivity.component:durationInputSlider
 * @description
 * # durationInputSlider
 */

(() => {
  'use strict';

  class DurationInputSliderCtrl {
    /* @ngInject */
    constructor(ParseDuration, $element, $scope) {
      const el = $element[0];
      this.el = el;
      this.$scope = $scope;
      this.minutesBefore = 0;
    }

    onModelChange() {
      console.log(this);
    }

    $onInit() {
      this.circle = this.el.querySelector('.handle-wrapper');

      this.mouseDownHandler = () => {
        this.el.classList.add('is-dragging');
        this.el.addEventListener('mousemove', this.mouseMoveHandler);
        this.el.addEventListener('mouseup', this.mouseUpHandler);
      };

      this.mouseMoveHandler = (ev) => {
        const centerX = 75;
        const centerY = 75;
        const x = ev.offsetX - centerX;
        const y = -1 * (ev.offsetY - centerY);
        const theta = Math.atan2(y, x) * (180 / Math.PI);

        const cssDegrees = convertThetaToCssDegrees(theta);
        //const isMovingRight = ev
        this.setValueFromRotation(cssDegrees);
        this.setCircleRotation(cssDegrees);
      };

      function convertThetaToCssDegrees(theta) {
        return 90 - theta;
      }

      this.mouseUpHandler = () => {
        this.el.classList.remove('is-dragging');
        this.el.removeEventListener('mousemove', this.mouseMoveHandler);
        this.el.removeEventListener('mouseup', this.mouseUpHandler);
      };

      this.el.addEventListener('mousedown', this.mouseDownHandler);

      this.setRotationFromValue();
    }

    $onDestroy() {
      this.el.removeEventListener('mousedown', this.mouseUpHandler);
      this.el.removeEventListener('mousemove', this.mouseMoveHandler);
      this.el.removeEventListener('mouseup', this.mouseUpHandler);
    }

    setCircleRotation(cssDegrees) {
      const rotate = 'rotate(' + cssDegrees + 'deg)';
      this.circle.style.transform = rotate;
    }

    setValueFromRotation(degrees) {
      let minutesFromDegrees;
      // NOTE: values are negative for the last quadrant
      if (degrees >= 0) {
        minutesFromDegrees = (degrees / 360 * 60);
      } else {
        minutesFromDegrees = ((degrees + 360) / 360 * 60)
      }

      minutesFromDegrees = parseInt(minutesFromDegrees, 10);

      let hours = parseInt(moment.duration(this.ngModel).asHours(), 10);

      const minuteDelta = minutesFromDegrees - this.minutesBefore;
      const threeshold = 40;
      if (minuteDelta > threeshold) {
        hours--;
      } else if (-1 * minuteDelta > threeshold) {
        hours++;
      }

      this.minutesBefore = minutesFromDegrees;

      if (hours < 0) {
        hours = 0;
      }

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
      const degrees = minutes * 360 / 60;
      this.minutesBefore = minutes;
      this.setCircleRotation(degrees);
    }
  }

  angular
    .module('superProductivity')
    .component('durationInputSlider', {
      templateUrl: 'scripts/duration-input-slider/duration-input-slider-cp.html',
      controller: DurationInputSliderCtrl,
      controllerAs: '$ctrl',
      bindings: {
        ngModel: '='
      },
      require: { $ngModelCtrl: '^ngModel' }
    });

  // hacky fix for ff
  DurationInputSliderCtrl.$$ngIsClass = true;
})();
