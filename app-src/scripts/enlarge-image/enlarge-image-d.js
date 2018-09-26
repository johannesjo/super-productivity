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

    return {top: Math.round(top), left: Math.round(left)};
  }

  class EnlargeImageCtrl {
    /* @ngInject */
    constructor($element) {
      this.lightboxParentEl = angular.element(document.body);
      this.$el = $element;
      this.imageEl = this.$el[0];

      $element.bind('click', () => {
        this.showImg();
      });
    }

    hideImg() {
      this.$enlargedImgWrapperEl.removeClass('ani-enter');
      this.$enlargedImgWrapperEl.addClass('ani-remove');
      this.setCoordsForImageAni();

      this.$enlargedImgWrapperEl.on('transitionend', () => {
        this.$enlargedImgWrapperEl.remove();
        this.imageEl.setAttribute('style', `visibility: visible`);
      });
    }

    setCoordsForImageAni() {
      const origImgCoords = getCoords(this.imageEl);
      const newImageCoords = getCoords(this.newImageEl);

      const scale = this.imageEl.width / this.newImageEl.width || 0.3;
      const startLeft = origImgCoords.left - newImageCoords.left;
      const startTop = origImgCoords.top - newImageCoords.top;
      console.log(scale, startLeft, startTop);

      this.newImageEl.setAttribute('style', `transform: translate3d(${startLeft}px, ${startTop}px, 0) scale(${scale})`);
    }

    showImg() {
      const enlargedImgWrapperEl = this.htmlToElement(`<div class="enlarged-image-wrapper"></div>`);
      this.newImageEl = this.htmlToElement(`<img src="${this.enlargeImage}" class="enlarged-image">`);
      enlargedImgWrapperEl.append(this.newImageEl);
      this.$enlargedImgWrapperEl = angular.element(enlargedImgWrapperEl);
      this.lightboxParentEl.append(this.$enlargedImgWrapperEl);
      this.setCoordsForImageAni();

      setTimeout(() => {
        this.$enlargedImgWrapperEl.addClass('ani-enter');
      }, 10);

      this.$enlargedImgWrapperEl.bind('click', () => {
        this.hideImg();
      });
      this.imageEl.setAttribute('style', `visibility: hidden`);

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
