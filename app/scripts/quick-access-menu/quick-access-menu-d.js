/**
 * @ngdoc directive
 * @name superProductivity.directive:quickAccessMenu
 * @description
 * # quickAccessMenu
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('quickAccessMenu', quickAccessMenu);

  /* @ngInject */
  function quickAccessMenu() {
    return {
      templateUrl: 'scripts/quick-access-menu/quick-access-menu-d.html',
      bindToController: true,
      controller: QuickAccessMenuCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function QuickAccessMenuCtrl(Dialogs) {
    this.isOpen = false;
    this.selectedMode = 'md-fling';

    this.openNotepad = () => {
      Dialogs('NOTES');
      this.isOpen = false;
    };
  }

})();
