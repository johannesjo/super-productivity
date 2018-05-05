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
    constructor(GlobalLinkList, $document, $scope, Dialogs, Tasks, $rootScope) {
      this.Dialogs = Dialogs;
      this.GlobalLinkList = GlobalLinkList;
      this.Tasks = Tasks;
      this.$scope = $scope;
      this.r = $rootScope.r;

      // required otherwise the page would be reloaded
      $document[0].ondragover = $document[0].ondrop = (ev) => {
        ev.preventDefault();
      };

      // handle drop
      $document[0].ondrop = (ev) => {
        const link = this.GlobalLinkList.createLinkFromDrop(ev);
        this.handleLinkInput(link, ev);
      };

      // handle paste
      $document[0].onpaste = (ev) => {
        const link = this.GlobalLinkList.createLinkFromPaste(ev);
        this.handleLinkInput(link, ev, true);
        //  const html = e.clipboardData.getData('text/html');
      };
    }

    handleLinkInput(link, ev, isPaste) {
      // don't intervene with text inputs
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') {
        return;
      }
      // only block on paste
      if (ev.target.getAttribute('contenteditable') && isPaste) {
        return;
      }

      // properly not intentional so we leave
      if (!link || !link.path) {
        return;
      }

      const focusModeEl = ev.target.closest('focus-view');
      const taskEl = ev.target.closest('.task');
      const markdownEl = ev.target.closest('inline-markdown');
      const isImagePath = link.path.match(/jpg|png/);
      console.log(focusModeEl, taskEl);

      if (focusModeEl) {
        const task = this.Tasks.getCurrent() || this.Tasks.getLastCurrent();

        if (markdownEl && isImagePath) {
          this.handleImageDrop(link, task);
        } else {
          this.openEditDialog(link, true, task);
        }

      } else if (taskEl) {
        const $taskEl = angular.element(taskEl);
        const task = $taskEl.scope().modelValue;

        if (markdownEl && isImagePath) {
          this.handleImageDrop(link, task);
        } else {
          this.openEditDialog(link, true, task);
        }
      } else {
        this.openEditDialog(link, true);
      }

      ev.preventDefault();
      ev.stopPropagation();
      this.$scope.$evalAsync();
    }

    handleImageDrop(link, task) {
      task.notes = task.notes + `<img src="${link.path}" style="max-width: 100%;">`;
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
