/**
 * @ngdoc directive
 * @name superProductivity.directive:quickAccessMenu
 * @description
 * # quickAccessMenu
 */

(function() {
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
  function QuickAccessMenuCtrl(Dialogs, $timeout) {
    this.isOpen = false;
    this.selectedMode = 'md-fling';

    // hacky fix to make sure it doesn't start open
    $timeout(() => {
      this.isOpen = true;
      $timeout(() => {
        this.isOpen = false;
      });
    });

    this.openNotepad = () => {
      Dialogs('NOTES');
      this.isOpen = false;
    };

    this.openDistractionPanel = () => {
      Dialogs('DISTRACTIONS');
      this.isOpen = false;
    };

    this.openHelp = () => {
      Dialogs('HELP', { template: 'PAGE' });
      this.isOpen = false;
    };

    this.openAddTask = () => {
      Dialogs('ADD_TASK');
      this.isOpen = false;
    };
  }

})();
