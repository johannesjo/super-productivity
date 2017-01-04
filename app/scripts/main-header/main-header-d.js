/**
 * @ngdoc directive
 * @name superProductivity.directive:mainHeader
 * @description
 * # mainHeader
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('mainHeader', mainHeader);

  /* @ngInject */
  function mainHeader() {
    return {
      templateUrl: 'scripts/main-header/main-header-d.html',
      bindToController: true,
      controller: MainHeaderCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {}
    };
  }

  /* @ngInject */
  function MainHeaderCtrl(Dialogs) {
    let vm = this;

    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };
  }

})();
