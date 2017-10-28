/**
 * @ngdoc service
 * @name superProductivity.GlobalLinkList
 * @description
 * # GlobalLinkList
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  const MAX_TITLE_LENGTH = 20;
  const TYPES = {
    FILE: 'FILE',
    LINK: 'LINK',
    TEXT: 'TEXT',
  };

  class GlobalLinkList {
    constructor($localStorage) {
      this.ls = $localStorage;
    }

    static baseName(passedStr) {
      console.log(passedStr);

      const str = passedStr.trim();
      let base;
      if (str[str.length - 1] === '/') {
        const strippedStr = str.substring(0, str.length - 2);
        base = strippedStr.substring(strippedStr.lastIndexOf('/') + 1);
      } else {
        base = str.substring(str.lastIndexOf('/') + 1);
      }

      if (base.lastIndexOf('.') !== -1) {
        base = base.substring(0, base.lastIndexOf('.'));
      }
      return base;
    }

    addText(text) {
      if (text) {
        if (text.match(/\n/)) {
          this.addItem({
            name: text.substr(0, MAX_TITLE_LENGTH),
            type: TYPES.TEXT
          });
        } else {
          let path = text;
          if (!path.match(/^http/)) {
            path = '//' + path;
          }
          this.addItem({
            name: this.constructor.baseName(text),
            path: path,
            type: TYPES.LINK
          });
        }
      }
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
