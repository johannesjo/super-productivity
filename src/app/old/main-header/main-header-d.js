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
      template: require('./main-header-d.html'),
      bindToController: true,
      controller: MainHeaderCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: true
    };
  }

  /* @ngInject */
  function MainHeaderCtrl(Dialogs, Projects) {
    let vm = this;
    vm.lastActiveTaskTask = undefined;

    vm.allProjects = Projects.getList();

    this.openMenu = function ($mdOpenMenu, ev) {
      $mdOpenMenu(ev);
    };

    vm.openHelp = () => {
      Dialogs('HELP', { template: 'PAGE' });
    };

    vm.changeProject = (project) => {
      Projects.changeCurrent(project);
    };
  }

})();
