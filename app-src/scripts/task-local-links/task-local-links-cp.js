/**
 * @ngdoc component
 * @name superProductivity.component:taskLocalLinks
 * @description
 * # taskLocalLinks
 */

(function() {
  'use strict';

  class TaskLocalLinksCtrl {
    /* @ngInject */
    constructor() {
    }

    removeLink($index) {
      this.localLinks.splice($index, 1);
    }
  }

  angular
    .module('superProductivity')
    .component('taskLocalLinks', {
      templateUrl: 'scripts/task-local-links/task-local-links-cp.html',
      controller: TaskLocalLinksCtrl,
      bindToController: true,
      controllerAs: '$ctrl',
      bindings: {
        localLinks: '='
      }
    });

})();
