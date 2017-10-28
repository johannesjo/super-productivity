/**
 * @ngdoc service
 * @name superProductivity.GlobalLinkList
 * @description
 * # GlobalLinkList
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  // const MAX_TITLE_LENGTH = 20;
  const TYPES = {
    FILE: 'FILE',
    LINK: 'LINK',
    TEXT: 'TEXT',
  };

  class GlobalLinkList {
    constructor($localStorage, SimpleToast) {
      this.ls = $localStorage;
      this.SimpleToast = SimpleToast;
    }

    static baseName(passedStr) {
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

    createLink(ev) {
      const text = ev.dataTransfer.getData('text');
      if (text) {
        return this.createTextLink(text);
      } else if (ev.dataTransfer) {
        return this.createFileLink(ev.dataTransfer);
      }
    }

    createTextLink(text) {
      if (text) {
        if (text.match(/\n/)) {
          //this.addItem({
          //  title: text.substr(0, MAX_TITLE_LENGTH),
          //  type: TYPES.TEXT
          //});
        } else {
          let path = text;
          if (!path.match(/^http/)) {
            path = '//' + path;
          }
          return {
            title: this.constructor.baseName(text),
            path: path,
            type: TYPES.LINK
          };
        }
      }
    }

    createFileLink(dataTransfer) {
      const path = dataTransfer.files[0].path;
      if (path) {
        return {
          title: this.constructor.baseName(path),
          path: path,
          type: TYPES.FILE
        };
      }
    }

    addItem(item) {
      if (item) {
        this.ls.globalLinks.push(item);
        this.SimpleToast('SUCCESS', '"' + item.title + '" added to global link dashboard');
      }
    }
  }

  angular
    .module('superProductivity')
    .service('GlobalLinkList', GlobalLinkList);

  // hacky fix for ff
  GlobalLinkList.$$ngIsClass = true;
})();
