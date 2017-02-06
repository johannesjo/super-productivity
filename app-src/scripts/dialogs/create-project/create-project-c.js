/**
 * @ngdoc function
 * @name superProductivity.controller:CreateProjectCtrl
 * @description
 * # CreateProjectCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('CreateProjectCtrl', CreateProjectCtrl);

  /* @ngInject */
  function CreateProjectCtrl($mdDialog, Projects, SimpleToast, IS_ELECTRON, $localStorage) {
    let vm = this;
    vm.IS_ELECTRON = IS_ELECTRON;
    vm.task = {};
    vm.projectSettings = {};
    vm.projectSettings.theme = $localStorage.theme;

    vm.createProject = (project) => {
      Projects.createNew(project.title, vm.projectSettings);
      SimpleToast('SUCCESS', 'You created the project "' + project.title + '"');
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
