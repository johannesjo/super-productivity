/**
 * @ngdoc service
 * @name superProductivity.GlobalLinkList
 * @description
 * # GlobalLinkList
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  const TYPES = {
    FILE: 'FILE',
  };

  class GlobalLinkList {
    constructor($localStorage) {
      this.ls = $localStorage;
    }

    static baseName(str) {
      let base = str.substring(str.lastIndexOf('/') + 1);
      if (base.lastIndexOf('.') !== -1) {
        base = base.substring(0, base.lastIndexOf('.'));
      }
      return base;
    }

    addFiles(dataTransfer) {
      const path = dataTransfer.files[0].path;

      if (path) {
        this.addItem({
          name: this.constructor.baseName(path),
          path: path,
          type: TYPES.FILE
        });
      }
    }

    addItem(item) {
      this.ls.globalLinks.push(item);
    }
  }

  angular
    .module('superProductivity')
    .service('GlobalLinkList', GlobalLinkList);

  // hacky fix for ff
  GlobalLinkList.$$ngIsClass = true;
})();
