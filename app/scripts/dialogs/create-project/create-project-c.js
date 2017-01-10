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
  function CreateProjectCtrl($mdDialog, Projects, $mdToast) {
    let vm = this;
    vm.task = {};

    vm.createProject = (project) => {
      Projects.createNew(project.title, {});

      let toast = $mdToast.simple()
        .textContent('You created the project "' + project.title + '"')
        .position('bottom');
      $mdToast.show(toast);

      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
