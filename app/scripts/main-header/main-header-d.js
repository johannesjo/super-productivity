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
      restrict: 'E'
    };
  }

  /* @ngInject */
  function MainHeaderCtrl(Dialogs, $rootScope, Tasks, Projects) {
    let vm = this;
    let lastCurrentTask;

    vm.r = $rootScope.r;

    vm.allProjects = Projects.getList();


    this.openMenu = function($mdOpenMenu, ev) {
      $mdOpenMenu(ev);
    };

    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };

    vm.toggleBreak = () => {
      if (!lastCurrentTask && !$rootScope.r.currentTask) {
        return;
      }

      vm.isOnBreak = !vm.isOnBreak;

      if (vm.isOnBreak) {
        lastCurrentTask = $rootScope.r.currentTask;
        Tasks.updateCurrent(null);
      } else {
        Tasks.updateCurrent(lastCurrentTask);
      }
    };
  }

})();
