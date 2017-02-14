/**
 * @ngdoc directive
 * @name superProductivity.directive:helpSection
 * @description
 * # helpSection
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('helpSection', helpSection);

  /* @ngInject */
  function helpSection() {
    return {
      templateUrl: 'scripts/help-section/help-section-d.html',
      bindToController: true,
      controller: HelpSectionCtrl,
      controllerAs: 'vm',
      transclude: true,
      restrict: 'E',
      scope: {}
    };
  }

  /* @ngInject */
  function HelpSectionCtrl() {
  }

})();
