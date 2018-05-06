/**
 * @ngdoc component
 * @name superProductivity.component:progressBar
 * @description
 * # progressBar
 */

(() => {
  'use strict';

  class ProgressBarCtrl {
    /* @ngInject */
    constructor($element) {
      this.$el = $element;
    }

    set progress(_value) {
      if (_value > 100) {
        this._progress = 100;
      } else {
        this._progress = _value;
      }

      if (this._progress > 1) {
        this.$el[0].style.visibility = 'visible';
        this.$el[0].style.width = `${this._progress}%`;
      } else {
        this.$el[0].style.visibility = 'hidden';
      }
    }

    get progress() {
      return this._progress;
    }
  }

  angular
    .module('superProductivity')
    .component('progressBar', {
      controller: ProgressBarCtrl,
      bindings: {
        progress: '=progress'
      },
    });

  // hacky fix for ff
  ProgressBarCtrl.$$ngIsClass = true;
})();
