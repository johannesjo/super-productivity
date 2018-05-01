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
    constructor(ParseDuration, $element) {
      const el = $element[0];
      this.el = el;
    }

    $onInit(){
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
        const rotate = 'rotate(' + cssDegrees + 'deg)';
        this.circle.style.transform = rotate;

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
    }

    $onDestroy() {
      this.el.removeEventListener('mousedown', this.mouseUpHandler);
      this.el.removeEventListener('mousemove', this.mouseMoveHandler);
      this.el.removeEventListener('mouseup', this.mouseUpHandler);
    }
  }

  angular
    .module('superProductivity')
    .component('durationInputSlider', {
      templateUrl: 'scripts/duration-input-slider/duration-input-slider-cp.html',
      controller: DurationInputSliderCtrl,
      controllerAs: '$ctrl',
      bindToController: {
        ngModel: '<'
      },
      require: { $ngModelCtrl: '^ngModel' }
    });

  // hacky fix for ff
  DurationInputSliderCtrl.$$ngIsClass = true;
})();
