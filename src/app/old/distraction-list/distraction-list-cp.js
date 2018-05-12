/**
 * @ngdoc component
 * @name superProductivity.component:distractionList
 * @description
 * # distractionList
 */

(() => {
  'use strict';

  class DistractionListCtrl {
    /* We dont use it here since it somehow get's injected twice then @XXXngInject */
    constructor($rootScope) {
      this.r = $rootScope.r;
    }
  }

  angular
    .module('superProductivity')
    .component('distractionList', {
      template: require('./distraction-list-cp.html'),
      controller: DistractionListCtrl,
      controllerAs: '$ctrl',
      bindToController: {},
    });

  // hacky fix for ff
  DistractionListCtrl.$$ngIsClass = true;
})();
