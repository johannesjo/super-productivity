/**
 * @ngdoc directive
 * @name superProductivity.directive:collapsible
 * @description
 * # collapsible
 */

(function() {
  'use strict';

  /* @ngInject */
  function CollapsibleCtrl($timeout, $element) {
    const vm = this;

    if ($element.attr('counter')) {
      vm.isCounter = true;
    }

    // TODO fix this
    $timeout(() => {
      if (vm.isInitiallyExpanded) {
        vm.isExpanded = true;
      }
    });

    vm.toggleExpand = () => {
      vm.isExpanded = !vm.isExpanded;

      if (vm.isExpanded) {
        $element.addClass('is-expanded');
      } else {
        $element.removeClass('is-expanded');
      }
    };

    vm.execAction = ($ev) => {
      $ev.preventDefault();
      $ev.stopPropagation();
      vm.btnAction();
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
        isInitiallyExpanded: '@',
        btnAction: '&',
        btnIcon: '@',
        counter: '<'
      }
    });
})();
