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
    constructor(GlobalLinkList, $document, $scope, Dialogs, Tasks, $element) {
      this.Dialogs = Dialogs;
      this.GlobalLinkList = GlobalLinkList;
      this.Tasks = Tasks;
      this.$scope = $scope;

      // required otherwise the page would be reloaded
      $document[0].ondragover = $document[0].ondrop = (ev) => {
        ev.preventDefault();
      };

      // add classes
      $element[0].ondragenter = () => {
        $element.addClass('drag-over');
      };
      $element[0].ondragleave = () => {
        $element.removeClass('drag-over')
      };

      // handle drop
      $document[0].ondrop = (ev) => {
        const link = this.GlobalLinkList.createLinkFromDrop(ev);
        this.handleLinkinput(link, ev);
      };

      // handle paste
      $document[0].onpaste = (ev) => {
        const link = this.GlobalLinkList.createLinkFromPaste(ev);
        this.handleLinkinput(link, ev);
        //  const html = e.clipboardData.getData('text/html');
      };
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
