/**
 * @ngdoc directive
 * @name superProductivity.directive:enlargeImage
 * @description
 * # enlargeImage
 */

(() => {
  'use strict';

  function getCoords(elem) { // crossbrowser version
    const box = elem.getBoundingClientRect();

    const body = document.body;
    const docEl = document.documentElement;

    const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const clientTop = docEl.clientTop || body.clientTop || 0;
    const clientLeft = docEl.clientLeft || body.clientLeft || 0;

    const top = box.top + scrollTop - clientTop;
    const left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
  }

  class EnlargeImageCtrl {
    /* @ngInject */
    constructor($element) {
      this.lightboxParentEl = angular.element(document.body);
      this.$el = $element;
      $element.bind('click', () => {
        this.showImg();
      });
    }

    hideImg() {
      this.$el[0].setAttribute('style', `visibility: visible`);
      this.$enlargedImgWrapperEl.remove();
    }

    showImg() {
      const enlargedImgWrapperEl = this.htmlToElement(`<div class="enlarged-image-wrapper"></div>`);
      const newImageEl = this.htmlToElement(`<img src="${this.enlargeImage}" class="enlarged-image">`);
      enlargedImgWrapperEl.append(newImageEl);
      const origImgCoords = getCoords(this.$el[0]);
      this.$enlargedImgWrapperEl = angular.element(enlargedImgWrapperEl);
      this.lightboxParentEl.append(this.$enlargedImgWrapperEl);
      const newImageCoords = getCoords(newImageEl);
      newImageEl.setAttribute('style', `transform: translate3d(${origImgCoords.left - newImageCoords.left - this.$el[0].width}px, ${origImgCoords.top - newImageCoords.top - this.$el[0].height}px, 0) scale(0.3)`);
      this.$enlargedImgWrapperEl.bind('click', () => {
        this.hideImg();
      });
      this.$el[0].setAttribute('style', `visibility: hidden`);

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
