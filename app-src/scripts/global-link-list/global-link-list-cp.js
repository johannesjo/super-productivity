/**
 * @ngdoc component
 * @name superProductivity.component:globalLinkList
 * @description
 * # globalLinkList
 */

(function() {
  'use strict';

  const CONTROLLER_AS = '$ctrl';

  class GlobalLinkListCtrl {
    /* @ngInject */
    constructor(GlobalLinkList, $document, $scope, Dialogs, Tasks) {
      this.Dialogs = Dialogs;
      this.GlobalLinkList = GlobalLinkList;
      this.Tasks = Tasks;
      this.$scope = $scope;

      $document[0].ondragover = $document[0].ondrop = (ev) => {
        ev.preventDefault();
      };

      $document[0].body.ondrop = (ev) => {
        const link = this.GlobalLinkList.createLinkFromDrop(ev);
        this.handleLinkinput(link, ev);
      };

      $document[0].onpaste = (ev) => {
        const link = this.GlobalLinkList.createLinkFromPaste(ev);
        this.handleLinkinput(link, ev);

        //const log = console.log;
        //const e = ev;
        //log('event.clipboardData');
        //if (e.clipboardData.types) {
        //  log('event.clipboardData.types');
        //
        //  // Look for a types property that is undefined
        //  if (!Array.isArray(e.clipboardData.types)) {
        //    log('event.clipboardData.types is undefined');
        //  }
        //
        //  // Loop the data store in type and display it
        //  var i = 0;
        //  while (i < e.clipboardData.types.length) {
        //    var key = e.clipboardData.types[i];
        //    var val = e.clipboardData.getData(key);
        //    log((i + 1) + ': ' + key + ' - ' + val);
        //    i++;
        //  }
        //
        //} else {
        //  // Look for access to data if types array is missing
        //  console.log('I am here!');
        //
        //  var text = e.clipboardData.getData('text/plain');
        //  var url = e.clipboardData.getData('text/uri-list');
        //  var html = e.clipboardData.getData('text/html');
        //  log('text/plain - ' + text);
        //  if (url !== undefined) {
        //    log('text/uri-list - ' + url);
        //  }
        //  if (html !== undefined) {
        //    log('text/html - ' + html);
        //  }
        //}
      }
    }

    handleLinkinput(link, ev) {
      // don't intervene with text inputs
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') {
        return;
      }

      const taskEl = ev.target.closest('.task');

      if (taskEl) {
        const $taskEl = angular.element(taskEl);
        const task = $taskEl.scope().modelValue;
        this.openEditDialog(link, true, task);
      } else {
        const linkList = ev.target.closest('global-link-list');
        if (linkList) {
          this.GlobalLinkList.addItem(link);
        } else {
          this.openEditDialog(link, true);
        }
      }

      ev.preventDefault();
      ev.stopPropagation();
      this.$scope.$apply();
    }

    openEditDialog(link, isNew, task) {
      this.Dialogs('EDIT_GLOBAL_LINK', { link, isNew, task }, true);
    }

    addLink() {
      this.openEditDialog(undefined, true);
    }

    remove($index) {
      this.globalLinks.splice($index, 1);
    }
  }

  angular
    .module('superProductivity')
    .component('globalLinkList', {
      templateUrl: 'scripts/global-link-list/global-link-list-cp.html',
      bindToController: true,
      controller: GlobalLinkListCtrl,
      controllerAs: CONTROLLER_AS,
      bindings: {
        globalLinks: '='
      }
    });

})();
