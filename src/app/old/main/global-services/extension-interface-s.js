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
    constructor(SimpleToast) {
      this.isInterfaceReady = false;
      this.SimpleToast = SimpleToast;

      interfaceEl.addEventListener('SP_EXTENSION_READY', () => {
        // we only want to show the notification once
        if (!this.isInterfaceReady) {
          this.SimpleToast('SUCCESS', 'Super Productivity Extension found and loaded.');
        }
        this.isInterfaceReady = true;
      });
    }

    addEventListener(ev, cb) {
      interfaceEl.addEventListener(ev, (ev) => {
        cb(ev, ev.detail);
      });
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
