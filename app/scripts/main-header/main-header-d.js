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
  function MainHeaderCtrl(Dialogs, $localStorage, Tasks, Projects, SimpleToast, $state) {
    let vm = this;
    vm.lastCurrentTask = undefined;

    vm.allProjects = Projects.getList();

    this.openMenu = function ($mdOpenMenu, ev) {
      $mdOpenMenu(ev);
    };

    vm.openAddTask = () => {
      Dialogs('ADD_TASK');
    };

    vm.changeProject = (project) => {
      Projects.changeCurrent(project);
    };

    vm.toggleBreak = () => {
      // reset time worked without break on break mode toggle
      if ($localStorage.currentSession) {
        $localStorage.currentSession.timeWorkedWithoutBreak = undefined;
      }
      const isGoOnBreak = !!$localStorage.currentTask;

      if (isGoOnBreak) {
        vm.lastCurrentTask = $localStorage.currentTask;
        Tasks.updateCurrent(null);
        SimpleToast('On break!');
      } else {
        if (vm.lastCurrentTask) {
          Tasks.updateCurrent(vm.lastCurrentTask);
        } else {
          Dialogs('TASK_SELECTION', { tasks: $localStorage.tasks })
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
