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
        this.handleDrag(ev);
      };
    }

    handleDrag(ev) {
      const taskEl = ev.target.closest('.task');
      const link = this.GlobalLinkList.createLink(ev);

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

    edit(link) {
      this.Dialogs('EDIT_GLOBAL_LINK', { link }, true);
    }

    addLink() {
      this.edit();
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
