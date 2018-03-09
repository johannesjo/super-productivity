/**
 * @ngdoc directive
 * @name superProductivity.directive:enlargeImage
 * @description
 * # enlargeImage
 */

(() => {
  'use strict';

  class EnlargeImageCtrl {
    /* @ngInject */
    constructor($element) {
      this.$el = $element;
      $element.bind('click', () => {
        this.showImg();
      });
    }

    hideImg() {
      this.$enlargedImgWrapperEl.remove();
    }

    showImg() {
      const enlargedImgWrapperEl = this.htmlToElement(`<div class="enlarged-image-wrapper"><img src="${this.enlargeImage}" class="enlarged-image"></div>`);
      this.$enlargedImgWrapperEl = angular.element(enlargedImgWrapperEl);

      this.$el.parent().append(this.$enlargedImgWrapperEl);

      this.$enlargedImgWrapperEl.bind('click', () => {
        this.hideImg();
      });
    }

    htmlToElement(html) {
      const template = document.createElement('template');
      html = html.trim(); // Never return a text node of whitespace as the result
      template.innerHTML = html;
      return template.content.firstChild;
    }
  }

  angular
    .module('superProductivity')
    .directive('enlargeImage', () => {
      return {
        bindToController: {
          enlargeImage: '<'
        },
        controller: EnlargeImageCtrl,
        controllerAs: '$ctrl',
        restrict: 'A',
        scope: true
      };
    });

  // hacky fix for ff
  EnlargeImageCtrl.$$ngIsClass = true;
})();
