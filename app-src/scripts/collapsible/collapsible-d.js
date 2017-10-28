/**
 * @ngdoc directive
 * @name superProductivity.directive:collapsible
 * @description
 * # collapsible
 */

(function() {
  'use strict';

  /* @ngInject */
  function CollapsibleCtrl($timeout) {
    const vm = this;

    // TODO fix this
    $timeout(() => {
      if (vm.isInitiallyExpanded) {
        vm.isExpanded = true;
      }
    });

    vm.toggleExpand = () => {
      vm.isExpanded = !vm.isExpanded;
    };
  }

  angular
    .module('superProductivity')
    .component('collapsible', {
      templateUrl: 'scripts/collapsible/collapsible-d.html',
      bindToController: true,
      controller: CollapsibleCtrl,
      controllerAs: 'vm',
      restrict: 'AE',
      transclude: true,
      bindings: {
        title: '@collapsibleTitle',
        icon: '@',
        isInitiallyExpanded: '@'
      }
    });
})();
