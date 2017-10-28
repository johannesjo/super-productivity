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
    constructor(GlobalLinkList, $document, $scope, $localStorage) {
      this.globalLinkList = GlobalLinkList;

      $document[0].ondragover = $document[0].ondrop = (ev) => {
        ev.preventDefault();
      };

      $document[0].body.ondrop = (ev) => {
        console.log($localStorage.globalLinks);

        console.log(ev);
        const text = ev.dataTransfer.getData('text');

        if (text) {
          console.log(text);
          GlobalLinkList.addText(text);
        } else if (ev.dataTransfer) {
          console.log(ev.dataTransfer);
          GlobalLinkList.addFiles(ev.dataTransfer);
        }
        ev.preventDefault();
        ev.stopPropagation();
        $scope.$apply();
      };
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
