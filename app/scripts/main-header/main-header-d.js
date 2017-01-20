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
      scope: true
    };
  }

  /* @ngInject */
  function MainHeaderCtrl(Dialogs, $rootScope, Tasks, Projects, SimpleToast, $state) {
    let vm = this;
    vm.lastCurrentTask = undefined;

    vm.r = $rootScope.r;

    vm.allProjects = Projects.getList();

    this.openMenu = function ($mdOpenMenu, ev) {
      $mdOpenMenu(ev);
    };

    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };

    vm.toggleBreak = () => {
      // reset time worked without break on break mode toggle
      if ($rootScope.r.currentSession) {
        $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;
      }
      const isGoOnBreak = !!$rootScope.r.currentTask;

      if (isGoOnBreak) {
        vm.lastCurrentTask = $rootScope.r.currentTask;
        Tasks.updateCurrent(null);
        SimpleToast('On break!');
      } else {
        if (vm.lastCurrentTask) {
          Tasks.updateCurrent(vm.lastCurrentTask);
        } else {
          Dialogs('TASK_SELECTION', { tasks: $rootScope.r.tasks })
            .then(() => {
              $state.go('work-view');
            });
        }

        vm.lastCurrentTask = undefined;
        SimpleToast('Off break!');
      }
    };
  }

})();
