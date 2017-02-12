/**
 * @ngdoc directive
 * @name superProductivity.directive:collapsible
 * @description
 * # collapsible
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('collapsible', collapsible);

  /* @ngInject */
  function collapsible() {
    return {
      templateUrl: 'scripts/collapsible/collapsible-d.html',
      bindToController: true,
      controller: CollapsibleCtrl,
      controllerAs: 'vm',
      restrict: 'AE',
      transclude: true,
      scope: {
        title: '@',
        icon: '@'
      }
    };
  }

  /* @ngInject */
  function CollapsibleCtrl() {
    const vm = this;

    vm.toggleExpand = () => {
      vm.isExpanded = !vm.isExpanded;
    };
  }

})();
