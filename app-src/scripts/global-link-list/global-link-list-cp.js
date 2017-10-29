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
        this.handleDrop(ev);
      };

      $document[0].onpaste = (ev) => {
        if (ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
          const link = this.GlobalLinkList.createLinkFromPaste(ev);
          this.openEditDialog(link, true);
        }

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

    handleDrop(ev) {
      const taskEl = ev.target.closest('.task');
      const link = this.GlobalLinkList.createLinkFromDrop(ev);

      if (taskEl) {
        const $taskEl = angular.element(taskEl);
        const task = $taskEl.scope().modelValue;
        this.Tasks.addLocalAttachment(task, link);
      } else {
        this.GlobalLinkList.addItem(link);
      }

      ev.preventDefault();
      ev.stopPropagation();
      this.$scope.$apply();
    }

    openEditDialog(link, isNew) {
      this.Dialogs('EDIT_GLOBAL_LINK', { link, isNew }, true);
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
