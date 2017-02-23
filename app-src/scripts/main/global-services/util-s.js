/**
 * @ngdoc service
 * @name superProductivity.Util
 * @description
 * # Util
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  /* @ngInject */
  class Util {
    constructor(IS_ELECTRON, $window) {
      this.IS_ELECTRON = IS_ELECTRON;
      this.$window = $window;
    }

    openExternalUrl(url) {
      if (this.IS_ELECTRON) {
        const shell = require('electron').shell;
        shell.openExternal(url);
      } else {
        const win = this.$window.open(url, '_blank');
        win.focus();
      }
    }
  }

  // hacky fix for ff
  Util.$$ngIsClass = true;

  angular
    .module('superProductivity')
    .service('Util', Util);
})();

