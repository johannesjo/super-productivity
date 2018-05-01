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

    onChangeValue(){
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
        this.el.addEventListener('mouseup', this.endHandler);

        this.el.addEventListener('touchmove', this.moveHandler);
        this.el.addEventListener('touchend', this.endHandler);
        this.el.classList.add('is-dragging');
      };

      this.moveHandler = (ev) => {
        // prevent touchmove
        ev.preventDefault();

        function convertThetaToCssDegrees(theta) {
          return 90 - theta;
        }

        const centerX = 75;
        const centerY = 75;
        let offsetX;
        let offsetY;

        if (ev.type === 'mousemove') {
          offsetX = ev.offsetX;
          offsetY = ev.offsetY;
        } else {
          const rect = ev.target.getBoundingClientRect();
          offsetX = ev.targetTouches[0].pageX - rect.left;
          offsetY = ev.targetTouches[0].pageY - rect.top;
        }

        const x = offsetX - centerX;
        const y = -1 * (offsetY - centerY);

        const theta = Math.atan2(y, x) * (180 / Math.PI);

        const cssDegrees = convertThetaToCssDegrees(theta);
        this.setValueFromRotation(cssDegrees);
      };

      this.endHandler = () => {
        //// should be 5 min values
        //const hours = Math.floor(this.ngModel.asHours());
        //const minutesFromDegrees = Math.round(this.ngModel.asMinutes() / 5) * 5;
        //this.ngModel = moment.duration({
        //  hours: hours,
        //  minutes: minutesFromDegrees
        //});

        this.el.classList.remove('is-dragging');
        this.el.removeEventListener('mousemove', this.moveHandler);
        this.el.removeEventListener('mouseup', this.endHandler);

        this.el.removeEventListener('touchmove', this.moveHandler);
        this.el.removeEventListener('touchend', this.endHandler);
      };

      this.el.addEventListener('mousedown', this.startHandler);
      this.el.addEventListener('touchstart', this.startHandler);

      this.setRotationFromValue();
    }

    $onDestroy() {
      // remove mouse events
      this.el.removeEventListener('mousedown', this.endHandler);
      this.el.removeEventListener('mousemove', this.moveHandler);
      this.el.removeEventListener('mouseup', this.endHandler);

      // remove touch events
    }

    setCircleRotation(cssDegrees) {
      this.circle.style.transform = 'rotate(' + cssDegrees + 'deg)';
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

      let hours = Math.floor(moment.duration(this.ngModel).asHours());

      const minuteDelta = minutesFromDegrees - this.minutesBefore;
      const threshold = 40;
      if (minuteDelta > threshold) {
        hours--;
      } else if (-1 * minuteDelta > threshold) {
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
        ngModel: '=',
        label: '@',
      },
      require: { $ngModelCtrl: '^ngModel' }
    });

  // hacky fix for ff
  DurationInputSliderCtrl.$$ngIsClass = true;
})();
