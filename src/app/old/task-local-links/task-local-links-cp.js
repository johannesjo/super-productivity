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

    removeLink(link) {
      const itemIndex = this.localLinks.findIndex(item => (item === link));
      this.localLinks.splice(itemIndex, 1);
    }
  }

  angular
    .module('superProductivity')
    .component('taskLocalLinks', {
      template: require('./task-local-links-cp.html'),
      controller: TaskLocalLinksCtrl,
      bindToController: true,
      controllerAs: '$ctrl',
      bindings: {
        localLinks: '='
      }
    });

})();
