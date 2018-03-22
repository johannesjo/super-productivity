/**
 * @ngdoc service
 * @name superProductivity.ExtensionInterface
 * @description
 * # ExtensionInterface
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const interfaceEl = window;

  class ExtensionInterface {
    /* @ngInject */
    constructor() {
      this.isInterfaceReady = false;

      interfaceEl.addEventListener('SP_EXTENSION_READY', () => {
        this.isInterfaceReady = true;
      });
    }

    addEventListener(ev, cb) {
      interfaceEl.addEventListener(ev, (ev) => {
        cb(ev, ev.detail);
      })
    }

    dispatchEvent(evName, data) {
      const ev = new CustomEvent(evName, {
        detail: data,
      });

      if (this.isInterfaceReady) {
        interfaceEl.dispatchEvent(ev);
      } else {
        setTimeout(() => {
          interfaceEl.dispatchEvent(ev);
        }, 2000);
      }
    }
  }

  angular
    .module('superProductivity')
    .service('ExtensionInterface', ExtensionInterface);

  // hacky fix for ff
  ExtensionInterface.$$ngIsClass = true;
})();
