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
      this.dialogs = Dialogs;

      $document[0].ondragover = $document[0].ondrop = (ev) => {
        ev.preventDefault();
      };

      $document[0].body.ondrop = (ev) => {
        const taskEl = ev.target.closest('.task');
        const link = GlobalLinkList.createLink(ev);

        if (taskEl) {
          const $taskEl = angular.element(taskEl);
          const task = $taskEl.scope().modelValue;
          Tasks.addLocalAttachment(task, link);
        } else {
          GlobalLinkList.addItem(link);
        }

        ev.preventDefault();
        ev.stopPropagation();
        $scope.$apply();
      };
    }

    edit(link) {
      this.dialogs('EDIT_GLOBAL_LINK', { link }, true);
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
